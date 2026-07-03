package com.ywt.passage.agent.agents;

import com.alibaba.cloud.ai.dashscope.chat.DashScopeChatModel;
import com.alibaba.cloud.ai.graph.OverAllState;
import com.alibaba.cloud.ai.graph.action.NodeAction;
import com.ywt.passage.agent.StreamHandlerContext;
import com.ywt.passage.agent.tools.ToolCallResult;
import com.ywt.passage.agent.tools.ToolRegistry;
import com.ywt.passage.model.dto.article.ArticleState;
import com.ywt.passage.model.enums.SseMessageTypeEnum;
import com.ywt.passage.utils.GsonUtils;
import com.ywt.passage.utils.StylePromptUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Flux;

import java.util.List;
import java.util.Map;
import java.util.function.Consumer;

/**
 * 正文生成 Agent
 * 根据大纲生成文章正文内容（支持流式输出 + ReAct 循环）
 * <p>
 * 改造说明：
 * - 按章节逐节处理
 * - 每章节引入 ReAct 循环（Thought → Action → Observation），最多 3 轮
 * - 正文生成 Agent 可通过 ToolRegistry 调用 web_search 工具查资料
 */
@Component
@Slf4j
@RequiredArgsConstructor
public class ContentGeneratorAgent implements NodeAction {

    public static final String INPUT_MAIN_TITLE = "mainTitle";
    public static final String INPUT_SUB_TITLE = "subTitle";
    public static final String INPUT_OUTLINE = "outline";
    public static final String INPUT_STYLE = "style";
    public static final String OUTPUT_CONTENT = "content";
    /**
     * 每章节最大 ReAct 循环轮数
     */
    private static final int MAX_REACT_ROUNDS = 3;
    private final DashScopeChatModel chatModel;
    private final ToolRegistry toolRegistry;

    @Override
    public Map<String, Object> apply(OverAllState state) throws Exception {
        // 主标题
        String mainTitle = state.value(INPUT_MAIN_TITLE)
                .map(Object::toString)
                .orElseThrow(() -> new IllegalArgumentException("缺少主标题参数"));

        // 副标题
        String subTitle = state.value(INPUT_SUB_TITLE)
                .map(Object::toString)
                .orElse("");

        // 大纲
        ArticleState.OutlineResult outline = state.value(INPUT_OUTLINE)
                .map(v -> {
                    if (v instanceof ArticleState.OutlineResult) {
                        return (ArticleState.OutlineResult) v;
                    }
                    return GsonUtils.fromJson(GsonUtils.toJson(v), ArticleState.OutlineResult.class);
                })
                .orElseThrow(() -> new IllegalArgumentException("缺少大纲参数"));

        // 风格
        String style = state.value(INPUT_STYLE)
                .map(Object::toString)
                .orElse(null);

        log.info("ContentGeneratorAgent 开始执行: mainTitle={}, 章节数={}",
                mainTitle, outline.getSections().size());

        // 获取流式处理器
        Consumer<String> streamHandler = StreamHandlerContext.get();

        // 按章节逐节执行 ReAct 循环
        StringBuilder fullContent = new StringBuilder();
        List<ArticleState.OutlineSection> sections = outline.getSections();

        int sectionSize = sections.size();
        for (int i = 0; i < sectionSize; i++) {
            ArticleState.OutlineSection section = sections.get(i);
            log.info("开始处理第 {}/{} 章节：{}", i + 1, sectionSize, section.getTitle());
            // 单章节 ReAct 循环
            String sectionContent = processSectionWithReAct(
                    mainTitle, subTitle, section, style, i + 1, streamHandler
            );

            fullContent.append(sectionContent).append("\n\n");

            // 流式推送完章节完成标记（便于前端感知进度）
            if (streamHandler != null) {
                streamHandler.accept(SseMessageTypeEnum.AGENT3_STREAMING.getStreamingPrefix()
                        + "\n\n<!-- SECTION_COMPLETE -->\n\n");
            }
        }
        String content = fullContent.toString().trim();

        // 编排模式下需要在正文节点结束时立刻通知前端，避免等整条 phase3 执行完才切步骤。
        StreamHandlerContext.send(SseMessageTypeEnum.AGENT3_COMPLETE.getValue());

        log.info("ContentGeneratorAgent 执行完成: 正文长度={}", content.length());

        return Map.of(OUTPUT_CONTENT, content);
    }

    /**
     * 对单个章节执行 ReAct 循环
     * <p>
     * 流程：
     * Round 1: Thought → 判断是否需要查资料
     * ├─ 需要 → Action: web_search → Observation → Round 2
     * └─ 不需要 → Action: GENERATE → 返回正文
     * Round 2: Thought → 判断 Observation 是否足够
     * ├─ 足够 → Action: GENERATE → 返回正文
     * └─ 不够 → Action: web_search (不同关键词) → Observation → Round 3
     * Round 3: 无论结果如何，必须 GENERATE（兜底）
     */
    private String processSectionWithReAct(
            String mainTitle, String subTitle,
            ArticleState.OutlineSection section, String style,
            int sectionIndex, Consumer<String> streamHandler) {

        // ReAct 上下文：累积本轮搜索到的资料
        StringBuilder reactContext = new StringBuilder();
        String sectionTitle = section.getTitle();
        String sectionPoints = String.join("\n", section.getPoints() != null ?
                section.getPoints() : List.of());

        // 在章节开始时
        StreamHandlerContext.send("REACT_SECTION_START:" + sectionTitle);

        // ReAct
        for (int round = 0; round < MAX_REACT_ROUNDS; round++) {
            log.info("ReAct 第 {} 轮：section={}，round={}", sectionIndex, sectionTitle, round + 1);

            // =========Thought：让LLM 判断是否需要调用工具=========
            String thoughtPrompt = buildThoughtPrompt(mainTitle, subTitle, sectionTitle, sectionPoints,
                    reactContext.toString(), round);
            // 在 Thought 阶段（调 LLM 前后）
            StreamHandlerContext.send("REACT_THOUGHT:sect=" + sectionTitle + ",round=" + (round + 1));
            ChatResponse thoughtResponse = chatModel.call(new Prompt(new UserMessage(thoughtPrompt)));
            String thought = thoughtResponse.getResult().getOutput().getText();

            if (thought == null) {
                continue;
            }

            log.info("ReAct Thought: section={},round={}，thought={}",
                    sectionTitle, round + 1, truncate(thought));

            // ======== Action: 解析 LLM 决策 ========
            if (thought.contains("DECISION: GENERATE") || thought.contains("GENERATE")) {
                //  LLM 认为知识足够 → 直接生成章节正文
                log.info("ReAct 决策: GENERATE, section={}, round={}", sectionTitle, round + 1);
                return generateSectionContent(
                        mainTitle, subTitle, sectionTitle, sectionPoints,
                        reactContext.toString(), style, streamHandler
                );
            }

            if ((thought.contains("DECISION: CALL_TOOL") ||
                    thought.contains("DECISION: SEARCH")) && round < MAX_REACT_ROUNDS - 1) {
                // LLM 需要查资料 → 调用工具（最后一轮强制 GENERATE，不调工具）
                String toolName = extractToolName(thought);
                String toolArgs = extractToolArgs(thought);
                String query = extractQueryFromArgs(toolArgs);

                // 推送：正在调用工具
                StreamHandlerContext.send("REACT_TOOL_CALL:tool=" + toolName + ",query=" + query);
                log.info("ReAct 决策: CALL_TOOL, section={}, tool={}, round={}",
                        sectionTitle, toolName, round + 1);

                ToolCallResult result = toolRegistry.callTool(toolName, toolArgs);
                String observation = result.isSuccess() ? result.getData() : "查询失败：" + result.getError();

                // ======== Observation: 把搜索结果加入上下文 ========
                reactContext.append("\n【第 ").append(round + 1).append(" 轮搜索结果】\n")
                        .append(observation).append("\n");
                // 推送：工具调用完成
                StreamHandlerContext.send("REACT_TOOL_RESULT:tool=" + toolName + ",success=" + result.isSuccess());
                log.info("ReAct Observation: section={}, round={}, observationLength={}",
                        sectionTitle, round + 1, observation.length());

                // 继续下一轮循环
                continue;
            }

            // 兜底：LLM 输出格式异常或到了最后一轮 → 直接生成
            log.info("ReAct 兜底生成: section={}, round={}", sectionTitle, round + 1);
            return generateSectionContent(
                    mainTitle, subTitle, sectionTitle, sectionPoints,
                    reactContext.toString(), style, streamHandler
            );
        }
        // 极限兜底（理论上不会走到这里）
        return generateSectionContent(
                mainTitle, subTitle, sectionTitle, sectionPoints,
                reactContext.toString(), style, streamHandler
        );
    }

    private String extractQueryFromArgs(String args) {
        try {
            @SuppressWarnings("unchecked")
            Map<String, String> argsMap = GsonUtils.getInstance().fromJson(args, Map.class);
            return argsMap.getOrDefault("query", "");
        } catch (Exception e) {
            return "";
        }
    }

    /**
     * 截断字符串（用于日志）
     */
    private String truncate(String str) {
        if (str == null) return "null";
        if (str.length() <= 100) return str;
        return str.substring(0, 100) + "...";
    }

    /**
     * 从 Thought 输出中提取工具参数
     */
    private String extractToolArgs(String thought) {
        // 格式：ARGS: {"query": "..."}
        StringBuilder jsonBuilder = new StringBuilder();
        boolean inJson = false;
        int braceCount = 0;

        for (String line : thought.split("\n")) {
            String trimmed = line.trim();
            if (trimmed.startsWith("ARGS:")) {
                String afterArgs = trimmed.substring(5).trim();
                inJson = true;
                jsonBuilder.append(afterArgs);
                // 统计括号数
                for (char c : afterArgs.toCharArray()) {
                    if (c == '{') braceCount++;
                    if (c == '}') braceCount--;
                }
                if (braceCount <= 0) break;
                continue;
            }
            if (inJson) {
                jsonBuilder.append("\n").append(trimmed);
                for (char c : trimmed.toCharArray()) {
                    if (c == '{') braceCount++;
                    if (c == '}') braceCount--;
                }
                if (braceCount <= 0) break;
            }
        }

        String json = jsonBuilder.toString().trim();
        return json.isEmpty() ? "{\"query\":\"\"}" : json;
    }

    /**
     * 从 Thought 输出中提取工具名称
     */
    private String extractToolName(String thought) {
        // 格式：TOOL: web_search
        for (String line : thought.split("\n")) {
            String trimmed = line.trim();
            if (trimmed.startsWith("TOOL:")) {
                return trimmed.substring(5).trim();
            }
        }
        return "web_search"; // 默认
    }

    /**
     * 构建章节生成 Prompt
     */
    private String buildSectionPrompt(
            String mainTitle, String subTitle,
            String sectionTitle, String sectionPoints,
            String reactContext, String style) {
        StringBuilder sb = new StringBuilder();
        sb.append("你是一位资深的内容创作者，擅长把内容写得自然、顺口。像真人在说话，而不是像公文或宣传稿。\n\n");
        sb.append("文章标题：").append(mainTitle);
        if (!subTitle.isBlank()) {
            sb.append("\n副标题：").append(subTitle);
        }
        sb.append("\n\n当前正在撰写章节：").append(sectionTitle);
        sb.append("\n该章节要点：\n").append(sectionPoints);

        if (!reactContext.isBlank()) {
            sb.append("\n\n参考资料（基于实时搜索）：\n").append(reactContext);
            sb.append("\n\n请基于以上参考资料撰写该章节，确保数据准确。");
        }

        sb.append("\n\n要求：");
        sb.append("\n1. 内容充实，每个章节 300-400 字");
        sb.append("\n2. 语言自然流畅，多用口语化表达");
        sb.append("\n3. 多写具体场景和例子，少写空泛总结");
        sb.append("\n4. 使用 Markdown 格式，章节使用 ## 标题");
        sb.append("\n5. 只输出该章节的内容，不要输出其他章节");
        sb.append(StylePromptUtil.getStylePrompt(style));

        sb.append("\n\n请直接返回该章节的 Markdown 正文内容，不要有其他内容。");

        return sb.toString();
    }

    /**
     * 生成单章节正文
     */
    private String generateSectionContent(
            String mainTitle, String subTitle,
            String sectionTitle, String sectionPoints,
            String reactContext, String style,
            Consumer<String> streamHandler) {

        String prompt = buildSectionPrompt(
                mainTitle, subTitle, sectionTitle, sectionPoints, reactContext, style
        );

        return callLlmWithStreaming(prompt, streamHandler);
    }

    /**
     * 构建 Thought Prompt
     * 让 LLM 判断当前章节的知识是否足够，是否需要调用工具查资料
     */
    private String buildThoughtPrompt(
            String mainTitle, String subTitle,
            String sectionTitle, String sectionPoints,
            String reactContext, int round) {
        StringBuilder sb = new StringBuilder();
        sb.append("你是一位严谨的内容创作者。请判断你是否有足够的知识来撰写以下章节。\n\n");
        sb.append("文章标题：").append(mainTitle);
        if (!subTitle.isBlank()) {
            sb.append("\n副标题：").append(subTitle);
        }
        sb.append("\n\n当前章节：").append(sectionTitle);
        sb.append("\n章节要点：\n").append(sectionPoints);

        if (!reactContext.isBlank()) {
            sb.append("\n\n已搜索到的参考资料：\n").append(reactContext);
            sb.append("\n\n请基于以上参考资料判断：这些信息是否足够支撑撰写该章节？");
        } else {
            sb.append("\n\n请判断：你是否有足够的知识撰写该章节？");
        }

        sb.append("\n\n你需要输出以下格式（严格按此格式，不要有其他内容）：\n");

        if (round < MAX_REACT_ROUNDS - 1) {
            // 非最后一轮，可以调工具
            sb.append("如果你需要查资料，输出：\n");
            sb.append("DECISION: CALL_TOOL\n");
            sb.append("TOOL: web_search\n");
            sb.append("ARGS: {\"query\": \"你希望搜索的关键词\"}\n");
            sb.append("REASON: 说明为什么要查这个资料\n\n");
        }

        sb.append("如果你知识足够，输出：\n");
        sb.append("DECISION: GENERATE\n");
        sb.append("REASON: 简要说明为什么不需要查资料\n");

        return sb.toString();
    }

    /**
     * 调用 LLM（流式输出）
     */
    private String callLlmWithStreaming(String prompt, Consumer<String> streamHandler) {
        StringBuilder contentBuilder = new StringBuilder();

        Flux<ChatResponse> streamResponse = chatModel.stream(new Prompt(new UserMessage(prompt)));

        streamResponse
                .doOnNext(response -> {
                    String chunk = response.getResult().getOutput().getText();
                    if (chunk != null && !chunk.isEmpty()) {
                        contentBuilder.append(chunk);
                        // 带前缀发送流式消息
                        if (streamHandler != null) {
                            streamHandler.accept(SseMessageTypeEnum.AGENT3_STREAMING.getStreamingPrefix() + chunk);
                        }
                    }
                })
                .doOnError(error -> log.error("ContentGeneratorAgent 流式调用失败", error))
                .blockLast();

        return contentBuilder.toString();
    }
}

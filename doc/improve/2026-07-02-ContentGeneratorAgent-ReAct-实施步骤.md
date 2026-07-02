# ContentGeneratorAgent ReAct 循环实施步骤

> 改造目标：APC-3 — 让正文生成 Agent 具备推理-行动循环能力
>
> 当前日期：2026-07-02 | 预估时间：1-2 天
>
> 前置依赖：APC-1 已完成（Tool 接口 + ToolRegistry + 2 个工具）

---

## 一、改造动机（面试必问）

**改造前的问题**：

当前 `ContentGeneratorAgent` 做的事：

```
接收完整大纲 → 拼一个超长 Prompt → 调 LLM.stream() 一次性吐出全文
```

这个模式有两个致命弱点：

1. **无法查资料**：如果大纲中有"2025年AI融资Top5"这样的数据点，LLM 只能凭训练数据编造
2. **无法分节校对**：全文一次性生成，前一章出了幻觉，后一章还会延续

**改造后**：

```
按章节逐节处理，每节最多 3 轮 Thought → Action → Observation：

  第1节：
    Thought: "这节需要 XX 数据，我不确定"
    Action: web_search("2025 AI funding top companies")
    Observation: "OpenAI $40B, Anthropic $15B..."
    → 基于 Observation 写正文

  第2节：
    Thought: "这节我知识够，直接写"
    Action: GENERATE
    → 直接写正文
```

**面试价值**：能讲清"Agent 的 ReAct 推理-行动循环"——不是概念吹嘘，是按章节粒度实现的真实循环。

---

## 二、整体架构

```
ContentGeneratorAgent.apply()
  │
  ├─ 接收: mainTitle, subTitle, outline (大纲含多个章节)
  │
  ├─ for each section in outline:
  │     │
  │     ├─ init sectionContext (该章节上下文)
  │     │
  │     ├─ for round = 0 to MAX_REACT_ROUNDS (默认3):
  │     │     │
  │     │     ├─ [Thought] 调 LLM 判断：
  │     │     │    ├─ 知识够 → 输出 "DECISION: GENERATE"
  │     │     │    └─ 需要查资料 → 输出 "DECISION: CALL_TOOL\nTOOL: web_search\nARGS: {...}"
  │     │     │
  │     │     ├─ [Action] 解析 DECISION：
  │     │     │    ├─ GENERATE → 调 LLM 生成该章节正文 → break
  │     │     │    └─ CALL_TOOL → toolRegistry.callTool() → 得到 Observation
  │     │     │
  │     │     └─ [Next Round] 把 Observation 加入 sectionContext，继续循环
  │     │
  │     └─ sectionContent → 追加到最终输出 + SSE 流式推送
  │
  └─ 返回: 完整正文
```

---

## 三、需要新建的文件（2 个）

### 3.1 `WebSearchTool.java`

**文件路径**：`src/main/java/com/ywt/passage/agent/tools/WebSearchTool.java`

这是 ReAct 循环中真正会用到的工具。注意：这个工具是**演示/象征性实现**，因为真实接入搜索引擎 API 需要第三方服务。当前实现为模拟搜索（返回占位结果），但接口和链路是正确的。

```java
package com.ywt.passage.agent.tools;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * 网页搜索工具
 * 供 ContentGeneratorAgent 在 ReAct 循环中调用，搜索实时资料补充正文。
 *
 * 注意：当前为模拟实现，返回占位搜索结果。
 * 生产环境可接入 SerpAPI / Bing Search API / Tavily 等真实搜索引擎。
 */
@Slf4j
@Component
public class WebSearchTool implements Tool {

    @Override
    public String getName() {
        return "web_search";
    }

    @Override
    public String getDescription() {
        return "搜索互联网获取实时信息。适合查找最新数据、新闻、统计数据、事实性内容时调用。";
    }

    @Override
    public String getParameterDescription() {
        return "{query: string (搜索关键词，中文或英文)}";
    }

    @Override
    public ToolCallResult execute(String args) {
        log.info("WebSearchTool 执行: args={}", args);
        try {
            @SuppressWarnings("unchecked")
            Map<String, String> argsMap = com.ywt.passage.utils.GsonUtils.getInstance()
                    .fromJson(args, Map.class);

            String query = argsMap.getOrDefault("query", "");
            if (query.isBlank()) {
                return ToolCallResult.failure("搜索关键词不能为空");
            }

            // **** 模拟搜索结果 ****
            // 真实环境下这里应调用搜索引擎 API
            String mockResult = String.format(
                    "【搜索结果】关于「%s」的相关信息：\n" +
                    "- 根据公开资料显示，这是一个当前热门话题\n" +
                    "- 建议在正文中引用权威来源以获得更准确的数据\n" +
                    "- 搜索结果摘要：%s 涉及多个维度的讨论和分析",
                    query, query
            );

            log.info("WebSearchTool 搜索完成: query={}", query);
            return ToolCallResult.success(mockResult);

        } catch (Exception e) {
            log.error("WebSearchTool 执行失败", e);
            return ToolCallResult.failure("搜索失败: " + e.getMessage());
        }
    }
}
```

### 3.2 不需要额外文件 — 所有改动在 ContentGeneratorAgent 内部

本次改造**只修改一个文件**：`ContentGeneratorAgent.java`

---

## 四、唯一需要修改的文件

### 4.1 类结构变化

| 项目 | 改造前 | 改造后 |
|------|--------|--------|
| 注入 | `DashScopeChatModel` | `DashScopeChatModel` + `ToolRegistry` |
| 方法 | `apply()` + `callLlmWithStreaming()` | `apply()` + `processSectionWithReAct()` + `callLlmForThought()` + `callLlmForSection()` + `callLlmWithStreaming()` |
| 流程 | 全篇一次生成 | 按章节逐节 ReAct |

### 4.2 完整代码

**文件路径**：`src/main/java/com/ywt/passage/agent/agents/ContentGeneratorAgent.java`

```java
package com.ywt.passage.agent.agents;

import com.alibaba.cloud.ai.dashscope.chat.DashScopeChatModel;
import com.alibaba.cloud.ai.graph.OverAllState;
import com.alibaba.cloud.ai.graph.action.NodeAction;
import com.ywt.passage.agent.StreamHandlerContext;
import com.ywt.passage.agent.tools.ToolCallResult;
import com.ywt.passage.agent.tools.ToolRegistry;
import com.ywt.passage.constant.PromptConstant;
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

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.function.Consumer;

/**
 * 正文生成 Agent
 * 根据大纲生成文章正文内容（支持流式输出 + ReAct 循环）
 *
 * 改造说明：
 * - 按章节逐节处理
 * - 每章节引入 ReAct 循环（Thought → Action → Observation），最多 3 轮
 * - 正文生成 Agent 可通过 ToolRegistry 调用 web_search 工具查资料
 */
@Component
@Slf4j
@RequiredArgsConstructor
public class ContentGeneratorAgent implements NodeAction {

    private final DashScopeChatModel chatModel;
    private final ToolRegistry toolRegistry;

    public static final String INPUT_MAIN_TITLE = "mainTitle";
    public static final String INPUT_SUB_TITLE = "subTitle";
    public static final String INPUT_OUTLINE = "outline";
    public static final String INPUT_STYLE = "style";
    public static final String OUTPUT_CONTENT = "content";

    /** 每章节最大 ReAct 循环轮数 */
    private static final int MAX_REACT_ROUNDS = 3;

    @Override
    public Map<String, Object> apply(OverAllState state) throws Exception {
        String mainTitle = state.value(INPUT_MAIN_TITLE)
                .map(Object::toString)
                .orElseThrow(() -> new IllegalArgumentException("缺少主标题参数"));

        String subTitle = state.value(INPUT_SUB_TITLE)
                .map(Object::toString)
                .orElse("");

        ArticleState.OutlineResult outline = state.value(INPUT_OUTLINE)
                .map(v -> {
                    if (v instanceof ArticleState.OutlineResult) {
                        return (ArticleState.OutlineResult) v;
                    }
                    return GsonUtils.fromJson(GsonUtils.toJson(v), ArticleState.OutlineResult.class);
                })
                .orElseThrow(() -> new IllegalArgumentException("缺少大纲参数"));

        String style = state.value(INPUT_STYLE)
                .map(Object::toString)
                .orElse(null);

        log.info("ContentGeneratorAgent 开始执行: mainTitle={}, 章节数={}", mainTitle, outline.getSections().size());

        // 获取流式处理器
        Consumer<String> streamHandler = StreamHandlerContext.get();

        // 按章节逐节执行 ReAct 循环
        StringBuilder fullContent = new StringBuilder();
        List<ArticleState.OutlineSection> sections = outline.getSections();

        for (int i = 0; i < sections.size(); i++) {
            ArticleState.OutlineSection section = sections.get(i);
            log.info("开始处理第 {}/{} 章节: {}", i + 1, sections.size(), section.getTitle());

            // 单章节 ReAct 循环
            String sectionContent = processSectionWithReAct(
                    mainTitle, subTitle, section, style, i + 1, sections.size(), streamHandler
            );

            fullContent.append(sectionContent).append("\n\n");

            // 流式推送章节完成标记（便于前端感知进度）
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
     *
     * 流程：
     *   Round 1: Thought → 判断是否需要查资料
     *     ├─ 需要 → Action: web_search → Observation → Round 2
     *     └─ 不需要 → Action: GENERATE → 返回正文
     *   Round 2: Thought → 判断 Observation 是否足够
     *     ├─ 足够 → Action: GENERATE → 返回正文
     *     └─ 不够 → Action: web_search (不同关键词) → Observation → Round 3
     *   Round 3: 无论结果如何，必须 GENERATE（兜底）
     */
    private String processSectionWithReAct(
            String mainTitle, String subTitle,
            ArticleState.OutlineSection section, String style,
            int sectionIndex, int totalSections,
            Consumer<String> streamHandler) {

        // ReAct 上下文：累积本轮搜索到的资料
        StringBuilder reactContext = new StringBuilder();
        String sectionTitle = section.getTitle();
        String sectionPoints = String.join("\n", section.getPoints() != null ? section.getPoints() : List.of());

        for (int round = 0; round < MAX_REACT_ROUNDS; round++) {
            log.info("ReAct 第 {} 轮: section={}, round={}", sectionIndex, sectionTitle, round + 1);

            // ======== Thought: 让 LLM 判断是否需要调用工具 ========
            String thoughtPrompt = buildThoughtPrompt(
                    mainTitle, subTitle, sectionTitle, sectionPoints,
                    reactContext.toString(), round, style
            );

            ChatResponse thoughtResponse = chatModel.call(new Prompt(new UserMessage(thoughtPrompt)));
            String thought = thoughtResponse.getResult().getOutput().getText();

            log.info("ReAct Thought: section={}, round={}, thought={}",
                    sectionTitle, round + 1, truncate(thought, 100));

            // ======== Action: 解析 LLM 决策 ========
            if (thought.contains("DECISION: GENERATE")) {
                // LLM 认为知识足够 → 直接生成章节正文
                log.info("ReAct 决策: GENERATE, section={}, round={}", sectionTitle, round + 1);
                return generateSectionContent(
                        mainTitle, subTitle, sectionTitle, sectionPoints,
                        reactContext.toString(), style, streamHandler
                );
            }

            if (thought.contains("DECISION: CALL_TOOL") && round < MAX_REACT_ROUNDS - 1) {
                // LLM 需要查资料 → 调用工具（最后一轮强制 GENERATE，不调工具）
                String toolName = extractToolName(thought);
                String toolArgs = extractToolArgs(thought);

                log.info("ReAct 决策: CALL_TOOL, section={}, tool={}, round={}",
                        sectionTitle, toolName, round + 1);

                ToolCallResult result = toolRegistry.callTool(toolName, toolArgs);
                String observation = result.isSuccess() ? result.getData() : "查询失败：" + result.getError();

                // ======== Observation: 把搜索结果加入上下文 ========
                reactContext.append("\n【第 ").append(round + 1).append(" 轮搜索结果】\n")
                        .append(observation).append("\n");

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

    /**
     * 构建 Thought Prompt
     * 让 LLM 判断当前章节的知识是否足够，是否需要调用工具查资料
     */
    private String buildThoughtPrompt(
            String mainTitle, String subTitle,
            String sectionTitle, String sectionPoints,
            String reactContext, int round, String style) {

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
     * 构建章节生成 Prompt
     */
    private String buildSectionPrompt(
            String mainTitle, String subTitle,
            String sectionTitle, String sectionPoints,
            String reactContext, String style) {

        StringBuilder sb = new StringBuilder();
        sb.append("你是一位资深的内容创作者，擅长把内容写得自然、顺口。\n\n");
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

    /**
     * 截断字符串（用于日志）
     */
    private String truncate(String str, int maxLength) {
        if (str == null) return "null";
        if (str.length() <= maxLength) return str;
        return str.substring(0, maxLength) + "...";
    }
}
```

---

## 五、执行步骤

按顺序操作：

### 第 1 步：新建 `WebSearchTool.java`

把上面 3.1 节的代码粘贴到：
`src/main/java/com/ywt/passage/agent/tools/WebSearchTool.java`

> ✅ `ToolRegistry` 有自动扫描机制（`@Resource List<Tool>`），新建后自动注册，无需额外配置。

### 第 2 步：完整替换 `ContentGeneratorAgent.java`

用上面 4.2 节的代码覆盖原有文件。

---

## 六、改造后行为验证

完成后运行测试，检查日志：

```
ContentGeneratorAgent 开始执行: mainTitle=xxx, 章节数=4
开始处理第 1/4 章节: 引言
ReAct 第 1 轮: section=1, round=1
ReAct Thought: section=引言, round=1, thought=DECISION: GENERATE...
ReAct 决策: GENERATE, section=引言, round=1
  → [流式输出引言正文...]
开始处理第 2/4 章节: 核心概念
ReAct 第 1 轮: section=2, round=1
ReAct Thought: section=核心概念, round=1, thought=DECISION: CALL_TOOL...
ReAct 决策: CALL_TOOL, section=核心概念, tool=web_search, round=1
调用工具: name=web_search, args={"query":"..."}
WebSearchTool 执行: args=...
ReAct Observation: section=核心概念, round=1, observationLength=xxx
ReAct 第 2 轮: section=2, round=2
ReAct Thought: section=核心概念, round=2, thought=DECISION: GENERATE...
ReAct 决策: GENERATE, section=核心概念, round=2
  → [流式输出核心概念正文...]
...
ContentGeneratorAgent 执行完成: 正文长度=xxxx
```

---

## 七、面试口径

### Q：ReAct 循环是怎么实现的？

> "ContentGeneratorAgent 按大纲章节逐节处理。每节进入一个最多 3 轮的 Thought→Action→Observation 循环：
>
> **Thought**：调一次 LLM，让 LLM 判断"我的知识够不够写这节"。如果够，输出 `DECISION: GENERATE`；如果不够，输出 `DECISION: CALL_TOOL` + 工具名 + 参数。
>
> **Action**：Java 代码解析 LLM 的输出。如果是 GENERATE，直接调 LLM 写该章节；如果是 CALL_TOOL，通过 ToolRegistry 调用 web_search 工具。
>
> **Observation**：工具返回搜索结果，拼入章节上下文。然后进入下一轮 Thought，这次 LLM 基于新搜索到的资料做判断。
>
> 第 3 轮强制 GENERATE，防止无限循环。"

### Q：为什么按章节而不是全文 ReAct？

> "全文一次性做 ReAct 有两个问题：第一，上下文太长，LLM 容易迷失；第二，一个章节需要查资料时，其他章节也得等着。按章节粒度，每节独立做 ReAct，既控制了上下文长度，又让需要查资料的章节单独处理，不需要查的章节直接生成。"

### Q：为什么 ToolRegistry 调用工具而不是直接调 API？

> "因为要统一管理。ToolRegistry 注册了所有可用工具（web_search、image_search、svg_generator），Agent 通过工具名调用，不需要知道具体实现。新增工具只需实现 Tool 接口并加 @Component，自动注册。这样 ContentGeneratorAgent 的 ReAct 循环和工具调用逻辑解耦，工具可以独立测试。"

---

## 八、问题和注意事项

### 问题 1：WebSearchTool 是模拟实现，面试怎么办？

**回答**：诚实说明当前是模拟实现，真实搜索引擎需要 API Key（如 SerpAPI / Bing Search API / Tavily）。但**接口和链路是完全正确的**——Tool 接口、ToolRegistry 注册、ContentGeneratorAgent 的 ReAct 循环，这些代码在生产环境只需替换 WebSearchTool.execute() 内部实现即可。

演示时可以展示：
- 日志中有 `调用工具: name=web_search` 的记录
- `ReAct Thought` 中 LLM 确实输出了 `DECISION: CALL_TOOL`
- `ReAct Observation` 中有搜索结果回填

### 问题 2：流式输出还能正常工作吗？

能。`generateSectionContent()` 内部仍调用 `callLlmWithStreaming()`，逐 chunk 推送。每个章节的流式内容实时推送到前端，用户体验与改造前一致。

唯一区别：**多个章节之间会有短暂停顿**（因为 ReAct 的 Thought 轮次是同步调用），前端看到的是"输出一段 → 暂停 → 输出一段"的模式，这其实是正常的 Agent 推理过程。

### 问题 3：调用 LLM 次数变多了，成本怎么办？

改造前：1 次流式调用 = 1 次 LLM 调用
改造后：N 个章节 × (ReAct 轮数 + 1) 次调用
- 如果 4 章 × 平均 1.5 轮 = 6 次 LLM 调用

成本增加约 6 倍。但每轮 Thought 的 Prompt 很短（几百 token），远小于生成正文的 Prompt（几千 token），所以实际成本增加约 2-3 倍。

---

## 九、与现有流程的兼容性

| 维度 | 兼容性 | 说明 |
|------|--------|------|
| SSE 流式 | ✅ | `callLlmWithStreaming()` 未变 |
| 前端 | ✅ | 前端接收的仍是 `AGENT3_STREAMING` 消息，格式不变 |
| ArticleState | ✅ | 最终 `content` 字段写入方式不变 |
| ParallelImageGenerator | ✅ | 下游不受影响 |
| ContentMergerAgent | ✅ | 下游不受影响 |

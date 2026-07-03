package com.ywt.passage.agent.agents;

import com.alibaba.cloud.ai.dashscope.chat.DashScopeChatModel;
import com.alibaba.cloud.ai.graph.OverAllState;
import com.alibaba.cloud.ai.graph.action.NodeAction;
import com.ywt.passage.agent.StreamHandlerContext;
import com.ywt.passage.constant.PromptConstant;
import com.ywt.passage.model.enums.SseMessageTypeEnum;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * 内容增强 Agent
 * <p>
 * 当 ContentEvaluatorAgent 评分不通过时执行。
 * 使用评估反馈作为优化指引，让 LLM 重新生成更高质的正文。
 */
@Component
@Slf4j
@RequiredArgsConstructor
public class ContentEnhancerAgent implements NodeAction {

    public static final String INPUT_CONTENT = "content";
    public static final String INPUT_MAIN_TITLE = "mainTitle";
    public static final String INPUT_EVALUATION_FEEDBACK = "evaluationFeedback";
    public static final String INPUT_ENHANCEMENT_ROUND = "enhancementRound";
    public static final String OUTPUT_CONTENT = "content";
    public static final String OUTPUT_ENHANCEMENT_ROUND = "enhancementRound";

    private final DashScopeChatModel chatModel;

    @Override
    public Map<String, Object> apply(OverAllState state) throws Exception {
        String content = state.value(INPUT_CONTENT)
                .map(Object::toString)
                .orElseThrow(() -> new IllegalArgumentException("缺少正文内容"));

        String mainTitle = state.value(INPUT_MAIN_TITLE)
                .map(Object::toString)
                .orElse("");

        String feedback = state.value(INPUT_EVALUATION_FEEDBACK)
                .map(Object::toString)
                .orElse("内容需要进一步优化");

        int round = state.value(INPUT_ENHANCEMENT_ROUND)
                .map(v -> Integer.parseInt(v.toString()))
                .orElse(0);

        log.info("ContentEnhancerAgent 开始增强: 正文长度={}, 轮次={}, feedback={}",
                content.length(), round + 1, truncate(feedback));

        StreamHandlerContext.send("AGENT_ENHANCING:round=" + (round + 1));

        String enhancePrompt = buildEnhancePrompt(mainTitle, content, feedback);
        ChatResponse response = chatModel.call(new Prompt(new UserMessage(enhancePrompt)));
        String enhancedContent = response.getResult().getOutput().getText();

        log.info("ContentEnhancerAgent 增强完成: 长度 {} → {}",
                content.length(), enhancedContent != null ? enhancedContent.length() : 0);

        // 更新流式正文到前端
        if (StreamHandlerContext.get() != null) {
            StreamHandlerContext.get()
                    .accept(SseMessageTypeEnum.AGENT3_STREAMING.getStreamingPrefix() + enhancedContent);
        }
        return Map.of(
                OUTPUT_CONTENT, enhancedContent != null ? enhancedContent : content,
                OUTPUT_ENHANCEMENT_ROUND, round + 1
        );
    }

    private String buildEnhancePrompt(String mainTitle, String content, String feedback) {
        return PromptConstant.AGENT_ENHANCER_PROMPT
                .replace("{mainTitle}", mainTitle)
                .replace("{content}", content)
                .replace("{feedback}", feedback);
    }

    private String truncate(String s) {
        return s == null ? "null" : (s.length() <= 200 ? s : s.substring(0, 200) + "...");
    }
}

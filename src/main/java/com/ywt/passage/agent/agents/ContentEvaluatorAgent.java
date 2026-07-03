package com.ywt.passage.agent.agents;


import com.alibaba.cloud.ai.dashscope.chat.DashScopeChatModel;
import com.alibaba.cloud.ai.graph.OverAllState;
import com.alibaba.cloud.ai.graph.action.NodeAction;
import com.ywt.passage.agent.StreamHandlerContext;
import com.ywt.passage.constant.PromptConstant;
import com.ywt.passage.utils.GsonUtils;
import com.ywt.passage.utils.LlmJsonUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * 内容质量评估 Agent
 * <p>
 * 在正文生成后执行，逐章节评估质量。
 * 输出 { "overallScore": 8, "pass": true, "feedback": "..." }
 * 当 overallScore >= 7 时视为通过。
 */
@Component
@Slf4j
@RequiredArgsConstructor
public class ContentEvaluatorAgent implements NodeAction {

    public static final String INPUT_CONTENT = "content";
    public static final String INPUT_MAIN_TITLE = "mainTitle";
    public static final String INPUT_ENHANCEMENT_ROUND = "enhancementRound";
    public static final String OUTPUT_CONTENT_SCORE = "contentScore";
    public static final String OUTPUT_EVALUATION_FEEDBACK = "evaluationFeedback";

    private final DashScopeChatModel chatModel;

    @Override
    public Map<String, Object> apply(OverAllState state) throws Exception {
        String content = state.value(INPUT_CONTENT)
                .map(Object::toString).orElseThrow(() -> new IllegalArgumentException("缺少正文内容参数"));
        String mainTitle = state.value(INPUT_MAIN_TITLE)
                .map(Object::toString).orElse("");
        // 当前增强伦次，用于兜底判定
        Integer round = state.value(INPUT_ENHANCEMENT_ROUND)
                .map(v -> Integer.parseInt(v.toString()))
                .orElse(0);
        log.info("ContentEvaluatorAgent 开始评估: 正文长度={}, 当前轮次={}", content.length(), round);
        StreamHandlerContext.send("AGENT_EVALUATING:round=" + (round + 1));

        // 如果已经到第二轮（轮次 ≥ 1），直接放过，不再评估
        // 使用满分 10 确保即使阈值被调高也不会死循环
        if (round >= 1) {
            log.info("ContentEvaluatorAgent 兜底：第二轮不评估，直接通过");
            return Map.of(
                    OUTPUT_CONTENT_SCORE, 10,
                    OUTPUT_EVALUATION_FEEDBACK, "第二轮兜底，直接通过"
            );
        }
        // 构建评估 Prompt
        String evalPrompt = buildEvaluationPrompt(mainTitle, content);
        String evalResult = chatModel.call(new Prompt(new UserMessage(evalPrompt)))
                .getResult().getOutput().getText();
        log.info("ContentEvaluatorAgent 评估结果: {}", truncate(evalResult));
        // 解析 LLM 返回的 JSON
        EvaluationResult result = parseEvaluationResult(evalResult);
        log.info("ContentEvaluatorAgent 解析: overallScore={}, pass={}",
                result.overallScore, result.overallScore >= 7);
        return Map.of(
                OUTPUT_CONTENT_SCORE, (int) Math.round(result.overallScore),
                OUTPUT_EVALUATION_FEEDBACK, result.feedback
        );
    }

    /**
     * 构建评估 Prompt
     */
    private String buildEvaluationPrompt(String mainTitle, String content) {
        return PromptConstant.AGENT_EVALUATOR_PROMPT
                .replace("{mainTitle}", mainTitle)
                .replace("{content}", content);
    }


    /**
     * 解析 LLM 返回的 JSON → EvaluationResult
     */
    private EvaluationResult parseEvaluationResult(String llmOutput) {
        try {
            return GsonUtils.fromJson(LlmJsonUtils.extractJsonCandidate(llmOutput),
                    EvaluationResult.class);
        } catch (Exception e) {
            log.warn("ContentEvaluatorAgent 解析失败，默认通过. output={}", truncate(llmOutput));
            return new EvaluationResult(7, "解析失败，默认通过");
        }
    }

    private String truncate(String s) {
        return s == null ? "null" : (s.length() <= 200 ? s : s.substring(0, 200) + "...");
    }

    /**
     * 评估结果内部类
     */
    public static class EvaluationResult {
        public double overallScore;
        public String feedback;

        public EvaluationResult() {
        }

        public EvaluationResult(double overallScore, String feedback) {
            this.overallScore = overallScore;
            this.feedback = feedback;
        }
    }
}

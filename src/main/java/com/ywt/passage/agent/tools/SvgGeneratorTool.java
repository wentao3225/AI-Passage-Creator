package com.ywt.passage.agent.tools;

import com.alibaba.cloud.ai.dashscope.chat.DashScopeChatModel;
import com.ywt.passage.constant.PromptConstant;
import com.ywt.passage.utils.GsonUtils;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * SVG 示意图生成工具
 * 调用 LLM 根据描述生成 SVG 代码
 */
@Slf4j
@Component
public class SvgGeneratorTool implements Tool {

    @Resource
    private DashScopeChatModel chatModel;

    @Override
    public String getName() {
        return "svg_generator";
    }

    @Override
    public String getDescription() {
        return "根据文字描述生成 SVG 概念示意图。适合需要流程图、概念图、结构图、关系图时调用。返回 SVG 代码。";
    }

    @Override
    public String getParameterDescription() {
        return "{prompt: string (中文描述，说明要表达的概念和关系)}";
    }

    @Override
    public ToolCallResult execute(String args) {
        log.info("SvgGeneratorTool 执行：args={}", args);
        try {
            //简单解析 args JSON
            @SuppressWarnings("unchecked")
            Map<String, String> argsMap = GsonUtils.
                    getInstance().fromJson(args, Map.class);

            String prompt = argsMap.getOrDefault("prompt", "");
            if (prompt.isBlank()) {
                return ToolCallResult.failure("SVG 生成描述不能为空");
            }

            // 复用现有的 SVG 生成 Prompt
            String fullPrompt = PromptConstant.SVG_DIAGRAM_GENERATION_PROMPT
                    .replace("{requirement}", prompt);

            // 调用 LLM
            ChatResponse response = chatModel.call(new Prompt(new UserMessage(fullPrompt)));
            String svgCode = response.getResult().getOutput().getText();
            if (svgCode == null || svgCode.isBlank()) {
                return ToolCallResult.failure("SVG 生成结果为空");
            }

            // 清理可能存在的 markdown 代码快标记
            svgCode = svgCode.replaceAll("```(?:xml|svg)?\\s*", "").trim();

            return ToolCallResult.success("SVG 生成成功，代码长度=" + svgCode.length() + "\nSVG代码:\n" + svgCode);
        } catch (Exception e) {
            log.error("SvgGeneratorTool 执行失败", e);
            return ToolCallResult.failure("SVG 生成失败: " + e.getMessage());
        }
    }
}

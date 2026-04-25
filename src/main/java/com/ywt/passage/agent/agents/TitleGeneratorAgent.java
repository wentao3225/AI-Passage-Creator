package com.ywt.passage.agent.agents;

import com.alibaba.cloud.ai.dashscope.chat.DashScopeChatModel;
import com.alibaba.cloud.ai.graph.OverAllState;
import com.alibaba.cloud.ai.graph.action.NodeAction;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.google.gson.reflect.TypeToken;
import com.ywt.passage.constant.PromptConstant;
import com.ywt.passage.model.dto.article.ArticleState;
import com.ywt.passage.utils.GsonUtils;
import com.ywt.passage.utils.LlmJsonUtils;
import com.ywt.passage.utils.StylePromptUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * 标题生成 Agent
 * 根据选题生成 3 ~ 5 个爆款标题方案
 */
@Component
@Slf4j
@RequiredArgsConstructor
public class TitleGeneratorAgent implements NodeAction {

    public static final String INPUT_TOPIC = "topic";
    public static final String INPUT_STYLE = "style";
    public static final String OUTPUT_TITLE_OPTIONS = "titleOptions";
    private final DashScopeChatModel chatModel;

    @Override
    public Map<String, Object> apply(OverAllState state) throws Exception {
        String topic = state.value(INPUT_TOPIC)
                .map(Object::toString)
                .orElseThrow(() -> new IllegalArgumentException("缺少选题参数"));

        String style = state.value(INPUT_STYLE)
                .map(Object::toString)
                .orElse(null);

        log.info("TitleGeneratorAgent 开始执行: topic={}, style={}", topic, style);

        // 构建 prompt
        String prompt = PromptConstant.AGENT1_TITLE_PROMPT
                .replace("{topic}", topic)
                + StylePromptUtil.getStylePrompt(style);

        // 调用 LLM
        ChatResponse response = chatModel.call(new Prompt(new UserMessage(prompt)));
        String content = response.getResult().getOutput().getText();

        // 解析结果（容错处理：支持 markdown 代码块、对象包裹数组、JSON 字符串包裹数组）
        List<ArticleState.TitleOption> titleOptions = parseTitleOptions(content);

        if (titleOptions == null || titleOptions.isEmpty()) {
            log.error("TitleGeneratorAgent 解析标题方案失败, rawContent={}", content);
            throw new IllegalStateException("标题方案解析失败：未生成有效标题方案");
        }

        log.info("TitleGeneratorAgent 执行完成: 生成了 {} 个标题方案", titleOptions.size());

        return Map.of(OUTPUT_TITLE_OPTIONS, titleOptions);
    }

    private List<ArticleState.TitleOption> parseTitleOptions(String rawContent) {
        if (rawContent == null || rawContent.isBlank()) {
            return null;
        }

        // 1) 直接尝试
        List<ArticleState.TitleOption> parsed = tryParseTitleOptionsFromJson(rawContent);
        if (isValidTitleOptions(parsed)) {
            return parsed;
        }

        // 2) 规范化 + 语法修复
        String normalized = LlmJsonUtils.normalizeJsonContent(rawContent);
        String repaired = LlmJsonUtils.repairJsonContent(normalized);
        parsed = tryParseTitleOptionsFromJson(repaired);
        if (isValidTitleOptions(parsed)) {
            return parsed;
        }

        // 3) 从文本中提取 JSON 片段再尝试
        String extracted = LlmJsonUtils.extractJsonCandidate(repaired);
        if (extracted != null && !extracted.isBlank()) {
            parsed = tryParseTitleOptionsFromJson(LlmJsonUtils.repairJsonContent(extracted));
            if (isValidTitleOptions(parsed)) {
                return parsed;
            }
        }

        return null;
    }

    private List<ArticleState.TitleOption> tryParseTitleOptionsFromJson(String json) {
        if (json == null || json.isBlank()) {
            return null;
        }

        try {
            JsonElement root = JsonParser.parseString(json);

            // 直接是数组
            if (root.isJsonArray()) {
                return GsonUtils.fromJson(root.toString(), new TypeToken<List<ArticleState.TitleOption>>() {
                });
            }

            // 可能是对象包裹：{"titleOptions":[...]}
            if (root.isJsonObject()) {
                JsonObject obj = root.getAsJsonObject();
                JsonElement optionsElement = obj.get(OUTPUT_TITLE_OPTIONS);
                if (optionsElement != null && optionsElement.isJsonArray()) {
                    return GsonUtils.fromJson(optionsElement.toString(),
                            new TypeToken<List<ArticleState.TitleOption>>() {
                            });
                }
                return null;
            }

            // 可能是字符串包裹 JSON："[{\"mainTitle\":...}]"
            if (root.isJsonPrimitive() && root.getAsJsonPrimitive().isString()) {
                String nested = root.getAsString();
                String nestedNormalized = Optional.ofNullable(LlmJsonUtils.normalizeJsonContent(nested)).orElse("");
                if (!nestedNormalized.isBlank()) {
                    List<ArticleState.TitleOption> nestedParsed = tryParseTitleOptionsFromJson(nestedNormalized);
                    if (isValidTitleOptions(nestedParsed)) {
                        return nestedParsed;
                    }
                    String nestedExtracted = LlmJsonUtils.extractJsonCandidate(nestedNormalized);
                    if (nestedExtracted != null && !nestedExtracted.isBlank()) {
                        return tryParseTitleOptionsFromJson(LlmJsonUtils.repairJsonContent(nestedExtracted));
                    }
                }
            }
        } catch (Exception ignored) {
            // 保持容错流程，不在这里中断
        }

        return null;
    }

    private boolean isValidTitleOptions(List<ArticleState.TitleOption> titleOptions) {
        return titleOptions != null
                && !titleOptions.isEmpty()
                && titleOptions.stream().allMatch(option -> option != null
                        && option.getMainTitle() != null
                        && !option.getMainTitle().isBlank()
                        && option.getSubTitle() != null
                        && !option.getSubTitle().isBlank());
    }
}

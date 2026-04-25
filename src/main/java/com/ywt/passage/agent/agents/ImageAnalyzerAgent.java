package com.ywt.passage.agent.agents;

import com.alibaba.cloud.ai.dashscope.chat.DashScopeChatModel;
import com.alibaba.cloud.ai.graph.OverAllState;
import com.alibaba.cloud.ai.graph.action.NodeAction;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.ywt.passage.constant.PromptConstant;
import com.ywt.passage.model.dto.article.ArticleState;
import com.ywt.passage.model.enums.ImageMethodEnum;
import com.ywt.passage.utils.GsonUtils;
import com.ywt.passage.utils.LlmJsonUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * 配图需求分析 Agent
 * 分析文章内容，生成配图需求列表
 */
@Component
@Slf4j
@RequiredArgsConstructor
public class ImageAnalyzerAgent implements NodeAction {

    public static final String INPUT_MAIN_TITLE = "mainTitle";
    public static final String INPUT_CONTENT = "content";
    public static final String INPUT_ENABLED_IMAGE_METHODS = "enabledImageMethods";
    public static final String OUTPUT_CONTENT_WITH_PLACEHOLDERS = "contentWithPlaceholders";
    public static final String OUTPUT_IMAGE_REQUIREMENTS = "imageRequirements";
    private final DashScopeChatModel chatModel;

    @Override
    public Map<String, Object> apply(OverAllState state) throws Exception {
        String mainTitle = state.value(INPUT_MAIN_TITLE)
                .map(Object::toString)
                .orElseThrow(() -> new IllegalArgumentException("缺少主标题参数"));

        String content = state.value(INPUT_CONTENT)
                .map(Object::toString)
                .orElseThrow(() -> new IllegalArgumentException("缺少正文内容参数"));

        @SuppressWarnings("unchecked")
        List<String> enabledMethods = state.value(INPUT_ENABLED_IMAGE_METHODS)
                .map(v -> {
                    if (v instanceof List) {
                        return (List<String>) v;
                    }
                    return null;
                })
                .orElse(null);

        log.info("ImageAnalyzerAgent 开始执行: mainTitle={}, enabledMethods={}", mainTitle, enabledMethods);

        // 构建可用配图方式说明
        String availableMethods = buildAvailableMethodsDescription(enabledMethods);
        // 构建各配图方式的详细使用指南（只包含允许的方式）
        String methodUsageGuide = buildMethodUsageGuide(enabledMethods);

        // 构建 prompt
        String prompt = PromptConstant.AGENT4_IMAGE_REQUIREMENTS_PROMPT
                .replace("{mainTitle}", mainTitle)
                .replace("{content}", content)
                .replace("{availableMethods}", availableMethods)
                .replace("{methodUsageGuide}", methodUsageGuide);

        // 调用 LLM
        ChatResponse response = chatModel.call(new Prompt(new UserMessage(prompt)));
        String responseContent = response.getResult().getOutput().getText();

        // 解析结果（容错处理：支持 markdown 代码块、对象包裹、JSON 字符串包裹）
        ArticleState.Agent4Result agent4Result = parseAgent4Result(responseContent);
        if (agent4Result == null) {
            log.error("ImageAnalyzerAgent 解析配图需求失败, rawContent={}", responseContent);
            throw new IllegalStateException("配图需求解析失败：未生成有效结构化结果");
        }

        String contentWithPlaceholders = agent4Result.getContentWithPlaceholders();
        if (!StringUtils.hasText(contentWithPlaceholders)) {
            // 降级回原正文，避免 Map.of 遇到 null 导致额外异常
            log.warn("ImageAnalyzerAgent 返回内容缺少 contentWithPlaceholders，回退到原正文");
            contentWithPlaceholders = content;
        }

        // 验证并过滤配图需求
        List<ArticleState.ImageRequirement> validatedRequirements = validateAndFilterImageRequirements(
                agent4Result.getImageRequirements(),
                enabledMethods);

        log.info("ImageAnalyzerAgent 执行完成: 配图需求数量={}, 验证后数量={}",
                agent4Result.getImageRequirements() == null ? 0 : agent4Result.getImageRequirements().size(),
                validatedRequirements.size());

        // 返回结果
        return Map.of(
                OUTPUT_CONTENT_WITH_PLACEHOLDERS, contentWithPlaceholders,
                INPUT_CONTENT, contentWithPlaceholders,
                OUTPUT_IMAGE_REQUIREMENTS, validatedRequirements);
    }

    private ArticleState.Agent4Result parseAgent4Result(String rawContent) {
        if (!StringUtils.hasText(rawContent)) {
            return null;
        }

        ArticleState.Agent4Result parsed = tryParseAgent4ResultFromJson(rawContent);
        if (isValidAgent4Result(parsed)) {
            return parsed;
        }

        String normalized = LlmJsonUtils.normalizeJsonContent(rawContent);
        String repaired = LlmJsonUtils.repairJsonContent(normalized);
        parsed = tryParseAgent4ResultFromJson(repaired);
        if (isValidAgent4Result(parsed)) {
            return parsed;
        }

        String extracted = LlmJsonUtils.extractJsonCandidate(repaired);
        if (StringUtils.hasText(extracted)) {
            parsed = tryParseAgent4ResultFromJson(LlmJsonUtils.repairJsonContent(extracted));
            if (isValidAgent4Result(parsed)) {
                return parsed;
            }
        }

        return null;
    }

    private ArticleState.Agent4Result tryParseAgent4ResultFromJson(String json) {
        if (!StringUtils.hasText(json)) {
            return null;
        }

        try {
            JsonElement root = JsonParser.parseString(json);

            if (root.isJsonObject()) {
                JsonObject object = root.getAsJsonObject();

                // 直接是目标对象
                if (object.has("contentWithPlaceholders") || object.has("imageRequirements")) {
                    return GsonUtils.fromJson(object.toString(), ArticleState.Agent4Result.class);
                }

                // 兼容 data/result/output 包裹
                for (String wrapperKey : List.of("data", "result", "output")) {
                    JsonElement wrapper = object.get(wrapperKey);
                    if (wrapper == null || wrapper.isJsonNull()) {
                        continue;
                    }

                    if (wrapper.isJsonObject()) {
                        ArticleState.Agent4Result nested = GsonUtils.fromJson(
                                wrapper.toString(), ArticleState.Agent4Result.class);
                        if (isValidAgent4Result(nested)) {
                            return nested;
                        }
                    }

                    if (wrapper.isJsonPrimitive() && wrapper.getAsJsonPrimitive().isString()) {
                        ArticleState.Agent4Result nested = parseAgent4Result(wrapper.getAsString());
                        if (isValidAgent4Result(nested)) {
                            return nested;
                        }
                    }
                }
                return null;
            }

            // 兼容字符串包裹 JSON
            if (root.isJsonPrimitive() && root.getAsJsonPrimitive().isString()) {
                String nested = Optional.ofNullable(root.getAsString()).orElse("");
                if (StringUtils.hasText(nested)) {
                    return parseAgent4Result(nested);
                }
            }
        } catch (Exception ignored) {
            // 容错解析流程中忽略单次失败，继续下一策略
        }

        return null;
    }

    private boolean isValidAgent4Result(ArticleState.Agent4Result result) {
        return result != null && StringUtils.hasText(result.getContentWithPlaceholders());
    }

    /**
     * 构建可用配图方式说明
     */
    private String buildAvailableMethodsDescription(List<String> enabledMethods) {
        if (enabledMethods == null || enabledMethods.isEmpty()) {
            return getAllMethodsDescription();
        }

        StringBuilder sb = new StringBuilder();
        for (String method : enabledMethods) {
            ImageMethodEnum methodEnum = ImageMethodEnum.getByValue(method);
            if (methodEnum != null && !methodEnum.isFallback()) {
                sb.append("   - ").append(methodEnum.getValue())
                        .append(": ").append(getMethodUsageDescription(methodEnum))
                        .append("\n");
            }
        }
        return sb.toString();
    }

    /**
     * 获取所有配图方式的完整描述
     */
    private String getAllMethodsDescription() {
        return """
                - PEXELS: 适合真实场景、产品照片、人物照片、自然风景等写实图片
                - MERMAID: 适合流程图、架构图、时序图、关系图、甘特图等结构化图表
                - ICONIFY: 适合图标、符号、小型装饰性图标（如：箭头、勾选、星星、心形等）
                - EMOJI_PACK: 适合表情包、搞笑图片、轻松幽默的配图
                - SVG_DIAGRAM: 适合概念示意图、思维导图样式、逻辑关系展示（不涉及精确数据）
                """;
    }

    /**
     * 获取配图方式的使用说明
     */
    private String getMethodUsageDescription(ImageMethodEnum method) {
        return switch (method) {
            case PEXELS -> "适合真实场景、产品照片、人物照片、自然风景等写实图片";
            case MERMAID -> "适合流程图、架构图、时序图、关系图、甘特图等结构化图表";
            case ICONIFY -> "适合图标、符号、小型装饰性图标（如：箭头、勾选、星星、心形等）";
            case EMOJI_PACK -> "适合表情包、搞笑图片、轻松幽默的配图";
            case SVG_DIAGRAM -> "适合概念示意图、思维导图样式、逻辑关系展示（不涉及精确数据）";
            default -> method.getDescription();
        };
    }

    /**
     * 构建配图方式的详细使用指南
     */
    private String buildMethodUsageGuide(List<String> enabledMethods) {
        List<String> methodsToInclude = (enabledMethods == null || enabledMethods.isEmpty())
                ? List.of("PEXELS", "MERMAID", "ICONIFY", "EMOJI_PACK", "SVG_DIAGRAM")
                : enabledMethods;

        StringBuilder sb = new StringBuilder();

        for (String method : methodsToInclude) {
            String guide = getMethodDetailedGuide(method);
            if (guide != null && !guide.isEmpty()) {
                sb.append(guide).append("\n");
            }
        }

        return sb.toString();
    }

    /**
     * 获取单个配图方式的详细使用指南
     */
    private String getMethodDetailedGuide(String method) {
        return switch (method) {
            case "PEXELS" -> "- PEXELS: 提供英文搜索关键词(keywords)，要准确、具体。prompt 留空。";
            case "MERMAID" -> "- MERMAID: 在 prompt 字段生成完整的 Mermaid 代码（如流程图、架构图）。keywords 留空。";
            case "ICONIFY" -> "- ICONIFY: 提供英文图标关键词(keywords)，如：check、arrow、star、heart。prompt 留空。";
            case "EMOJI_PACK" -> "- EMOJI_PACK: 提供中文或英文关键词(keywords)描述表情内容。prompt 留空。";
            case "SVG_DIAGRAM" ->
                "- SVG_DIAGRAM: 在 prompt 字段描述示意图需求（中文），说明要表达的概念和关系。keywords 留空。";
            default -> null;
        };
    }

    /**
     * 验证并过滤配图需求
     */
    private List<ArticleState.ImageRequirement> validateAndFilterImageRequirements(
            List<ArticleState.ImageRequirement> requirements,
            List<String> enabledMethods) {

        if (requirements == null || requirements.isEmpty()) {
            return new ArrayList<>();
        }

        if (enabledMethods == null || enabledMethods.isEmpty()) {
            return requirements;
        }

        List<ArticleState.ImageRequirement> validatedRequirements = new ArrayList<>();

        for (ArticleState.ImageRequirement req : requirements) {
            String imageSource = req.getImageSource();

            if (enabledMethods.contains(imageSource)) {
                validatedRequirements.add(req);
            } else {
                log.warn("配图需求不符合限制被过滤, position={}, imageSource={}",
                        req.getPosition(), imageSource);

                // 尝试替换为允许的方式
                if (!enabledMethods.isEmpty()) {
                    String fallbackSource = enabledMethods.getFirst();
                    req.setImageSource(fallbackSource);
                    validatedRequirements.add(req);
                    log.info("配图需求已替换为允许的方式, position={}, fallback={}",
                            req.getPosition(), fallbackSource);
                }
            }
        }

        return validatedRequirements;
    }
}

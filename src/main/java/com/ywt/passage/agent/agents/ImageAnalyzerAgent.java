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

import java.util.*;

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
        // 从图状态中读取当前轮配图分析所需的最小输入：标题、正文、允许的配图方式。
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

        // 这两段文本会直接拼进 prompt：
        // 1. allowedMethods 告诉模型“只能用哪些来源”；
        // 2. methodUsageGuide 告诉模型“每种来源该填哪个字段”。
        String availableMethods = buildAvailableMethodsDescription(enabledMethods);
        log.info("ImageAnalyzerAgent 构建可用配图方式说明: {}", availableMethods);
        String methodUsageGuide = buildMethodUsageGuide(enabledMethods);

        // 将文章内容和配图约束注入统一模板，让 LLM 输出“正文占位符 + 配图需求列表”。
        String prompt = PromptConstant.AGENT4_IMAGE_REQUIREMENTS_PROMPT
                .replace("{mainTitle}", mainTitle)
                .replace("{content}", content)
                .replace("{availableMethods}", availableMethods)
                .replace("{methodUsageGuide}", methodUsageGuide);

        // 先让 LLM 负责“想方案”，后面的 Java 逻辑再负责“把方案清洗成可执行格式”。
        ChatResponse response = chatModel.call(new Prompt(new UserMessage(prompt)));
        String responseContent = response.getResult().getOutput().getText();

        // LLM 返回的 JSON 经常不够规整，所以这里做多层容错解析。
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

        // 对模型产出的每条配图需求做二次清洗：
        // - 来源必须在允许范围内
        // - 必要字段不能为空
        // - 必要时替换为更合适的允许来源
        List<ArticleState.ImageRequirement> validatedRequirements = validateAndFilterImageRequirements(
            agent4Result.getImageRequirements(),
            enabledMethods,
            mainTitle);

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

        // 第 1 层：先按“它刚好就是合法 JSON”来解析。
        ArticleState.Agent4Result parsed = tryParseAgent4ResultFromJson(rawContent);
        if (isValidAgent4Result(parsed)) {
            return parsed;
        }

        // 第 2 层：清理 markdown 代码块、转义和常见格式脏数据，再重试。
        String normalized = LlmJsonUtils.normalizeJsonContent(rawContent);
        String repaired = LlmJsonUtils.repairJsonContent(normalized);
        parsed = tryParseAgent4ResultFromJson(repaired);
        if (isValidAgent4Result(parsed)) {
            return parsed;
        }

        // 第 3 层：如果整段文本里混了说明文字，就尽量抽取最像 JSON 的片段再解析。
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

                // 最理想的情况：顶层就是目标结构。
                if (object.has("contentWithPlaceholders") || object.has("imageRequirements")) {
                    return GsonUtils.fromJson(object.toString(), ArticleState.Agent4Result.class);
                }

                // 常见的 LLM 套壳格式：data/result/output 再包一层对象或字符串。
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

            // 兼容最外层是字符串，字符串内部才是真正 JSON 的情况。
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
            List<String> enabledMethods,
            String mainTitle) {

        if (requirements == null || requirements.isEmpty()) {
            return new ArrayList<>();
        }

        // enabledMethods 为空时，代表本次任务没有做来源限制，直接保留模型输出。
        List<ImageMethodEnum> allowedMethods = normalizeEnabledMethods(enabledMethods);
        if (allowedMethods.isEmpty()) {
            return requirements;
        }

        List<ArticleState.ImageRequirement> validatedRequirements = new ArrayList<>();

        // 逐条修复 requirement，而不是整体失败；这样单条异常不会拖垮整篇文章。
        for (ArticleState.ImageRequirement req : requirements) {
            ArticleState.ImageRequirement resolvedRequirement = resolveRequirement(req, allowedMethods, mainTitle);
            if (resolvedRequirement != null) {
                validatedRequirements.add(resolvedRequirement);
            }
        }

        return validatedRequirements;
    }

    private ArticleState.ImageRequirement resolveRequirement(ArticleState.ImageRequirement requirement,
                                                             List<ImageMethodEnum> allowedMethods,
                                                             String mainTitle) {
        String originalSource = requirement.getImageSource();
        ImageMethodEnum sourceMethod = ImageMethodEnum.getByValue(originalSource);

        if (sourceMethod == null || !allowedMethods.contains(sourceMethod)) {
            log.warn("配图需求不符合限制被过滤, position={}, imageSource={}",
                    requirement.getPosition(), originalSource);
        }

        // 候选来源列表的顺序很重要：
        // - 先尝试原来源（如果它本来就在允许范围内）
        // - 再按场景化偏好尝试兜底来源
        List<ImageMethodEnum> candidates = buildCandidateMethods(requirement, sourceMethod, allowedMethods);
        for (ImageMethodEnum candidate : candidates) {
            // 每次尝试都复制一份，避免前一个候选来源的修补污染后一个候选来源。
            ArticleState.ImageRequirement candidateRequirement = copyRequirement(requirement);
            candidateRequirement.setImageSource(candidate.getValue());

            // 按来源规则补字段，例如：
            // - SVG/MERMAID 重点补 prompt
            // - PEXELS/ICONIFY/EMOJI 重点补 keywords
            fillMissingRequirementFields(candidateRequirement, candidate, mainTitle);

            // 只要补完之后能真正给下游图片服务使用，就保留这条需求。
            if (hasUsablePayload(candidateRequirement, candidate)) {
                logRequirementAdjustment(requirement, candidateRequirement, originalSource, candidate);
                return candidateRequirement;
            }
        }

        log.warn("配图需求缺少必要参数且无法修复, position={}, imageSource={}, sectionTitle={}",
                requirement.getPosition(), originalSource, requirement.getSectionTitle());
        return null;
    }

    private List<ImageMethodEnum> normalizeEnabledMethods(List<String> enabledMethods) {
        if (enabledMethods == null || enabledMethods.isEmpty()) {
            return List.of();
        }

        List<ImageMethodEnum> normalizedMethods = new ArrayList<>();
        for (String enabledMethod : enabledMethods) {
            ImageMethodEnum methodEnum = ImageMethodEnum.getByValue(enabledMethod);
            if (methodEnum != null && !methodEnum.isFallback() && !normalizedMethods.contains(methodEnum)) {
                normalizedMethods.add(methodEnum);
            }
        }

        if (normalizedMethods.isEmpty()) {
            log.warn("enabledMethods 未解析出有效配图方式, 将跳过限制校验, enabledMethods={}", enabledMethods);
        }

        return normalizedMethods;
    }

    private List<ImageMethodEnum> buildCandidateMethods(ArticleState.ImageRequirement requirement,
                                                        ImageMethodEnum sourceMethod,
                                                        List<ImageMethodEnum> allowedMethods) {
        List<ImageMethodEnum> candidates = new ArrayList<>();

        // 原来源本身合法时，优先保留原意，先试原来源。
        if (sourceMethod != null && allowedMethods.contains(sourceMethod)) {
            candidates.add(sourceMethod);
        }

        // 再按场景化优先级补齐候选列表，例如封面、图标、结构图的偏好顺序不同。
        for (ImageMethodEnum candidate : buildFallbackPreference(requirement, sourceMethod)) {
            if (allowedMethods.contains(candidate) && !candidates.contains(candidate)) {
                candidates.add(candidate);
            }
        }

        // 理论上的兜底：如果前面一个都没选出来，就退回到所有允许方式逐个尝试。
        if (candidates.isEmpty()) {
            candidates.addAll(allowedMethods);
        }

        return candidates;
    }

    private ArticleState.ImageRequirement copyRequirement(ArticleState.ImageRequirement requirement) {
        // 这里做浅复制已经足够，因为字段都是值类型/字符串，不存在复杂嵌套对象。
        ArticleState.ImageRequirement copy = new ArticleState.ImageRequirement();
        copy.setPosition(requirement.getPosition());
        copy.setType(requirement.getType());
        copy.setSectionTitle(requirement.getSectionTitle());
        copy.setKeywords(requirement.getKeywords());
        copy.setImageSource(requirement.getImageSource());
        copy.setPrompt(requirement.getPrompt());
        copy.setPlaceholderId(requirement.getPlaceholderId());
        return copy;
    }

    private void fillMissingRequirementFields(ArticleState.ImageRequirement requirement,
                                             ImageMethodEnum method,
                                             String mainTitle) {
        // type 缺失时做最小推断，避免下游只能拿到“第几张图”却不知道它属于封面/正文/行内图标。
        if (!StringUtils.hasText(requirement.getType())) {
            if (isCoverPosition(requirement)) {
                requirement.setType("cover");
            } else if (isIconRequirement(requirement)) {
                requirement.setType("inline");
            } else {
                requirement.setType("section");
            }
        }

        switch (method) {
            case SVG_DIAGRAM -> {
                // SVG 概念图只依赖 prompt，keywords 清空，避免下游误用旧值。
                requirement.setKeywords("");
                if (!StringUtils.hasText(requirement.getPrompt())) {
                    requirement.setPrompt(buildSvgPrompt(requirement, mainTitle));
                }
            }
            case MERMAID -> {
                // Mermaid 也走 prompt，且 prompt 需要是可执行的 Mermaid 代码。
                requirement.setKeywords("");
                if (!StringUtils.hasText(requirement.getPrompt())) {
                    requirement.setPrompt(buildMermaidPrompt(requirement, mainTitle));
                }
            }
            case EMOJI_PACK -> {
                // 表情包检索更依赖关键词，所以把 prompt 清空，集中保留 keywords。
                requirement.setPrompt("");
                if (!StringUtils.hasText(requirement.getKeywords())) {
                    requirement.setKeywords(buildEmojiKeywords(requirement, mainTitle));
                }
            }
            case ICONIFY -> {
                // ICONIFY 本质也是检索图标词，不需要 prompt。
                requirement.setPrompt("");
                if (!StringUtils.hasText(requirement.getKeywords())) {
                    requirement.setKeywords(buildIconKeywords(requirement, mainTitle));
                }
            }
            case PEXELS -> {
                // 图库搜索使用关键词；如果模型只给了空值，这里补一个最小可检索词组。
                requirement.setPrompt("");
                if (!StringUtils.hasText(requirement.getKeywords())) {
                    requirement.setKeywords(buildPexelsKeywords(requirement, mainTitle));
                }
            }
            default -> {
            }
        }
    }

    private boolean hasUsablePayload(ArticleState.ImageRequirement requirement, ImageMethodEnum method) {
        if (requirement == null || method == null) {
            return false;
        }

        // 这是最终闸门：不同来源虽然字段名不同，但至少要有一个下游能消费的核心参数。
        return switch (method) {
            case SVG_DIAGRAM, MERMAID -> StringUtils.hasText(requirement.getPrompt())
                    || StringUtils.hasText(requirement.getKeywords());
            case PEXELS, ICONIFY, EMOJI_PACK -> StringUtils.hasText(requirement.getKeywords())
                    || StringUtils.hasText(requirement.getPrompt());
            default -> false;
        };
    }

    private void logRequirementAdjustment(ArticleState.ImageRequirement original,
                                          ArticleState.ImageRequirement resolved,
                                          String originalSource,
                                          ImageMethodEnum resolvedMethod) {
        // 只在发生“真正修正”时记日志，避免普通正常路径刷太多无效日志。
        boolean sourceChanged = !Objects.equals(originalSource, resolved.getImageSource());
        boolean promptFilled = !StringUtils.hasText(original.getPrompt()) && StringUtils.hasText(resolved.getPrompt());
        boolean keywordsFilled = !StringUtils.hasText(original.getKeywords()) && StringUtils.hasText(resolved.getKeywords());

        if (sourceChanged || promptFilled || keywordsFilled) {
            log.info("配图需求已修正, position={}, original={}, resolved={}, promptFilled={}, keywordsFilled={}",
                    resolved.getPosition(),
                    originalSource,
                    resolvedMethod.getValue(),
                    promptFilled,
                    keywordsFilled);
        }
    }


    private List<ImageMethodEnum> buildFallbackPreference(ArticleState.ImageRequirement requirement,
                                                          ImageMethodEnum sourceMethod) {
        List<ImageMethodEnum> preference = new ArrayList<>();

        // 封面图优先尝试更适合作为主视觉的大图/概念图来源。
        if (isCoverRequirement(requirement)) {
            addPreference(preference,
                    ImageMethodEnum.SVG_DIAGRAM,
                    ImageMethodEnum.PEXELS,
                    ImageMethodEnum.EMOJI_PACK,
                    ImageMethodEnum.MERMAID,
                    ImageMethodEnum.ICONIFY);
            return preference;
        }

        // 行内小图标优先保留 ICONIFY，其次退到表情包。
        if (isIconRequirement(requirement)) {
            addPreference(preference,
                    ImageMethodEnum.ICONIFY,
                    ImageMethodEnum.EMOJI_PACK,
                    ImageMethodEnum.SVG_DIAGRAM,
                    ImageMethodEnum.MERMAID,
                    ImageMethodEnum.PEXELS);
            return preference;
        }

        // 如果内容明显在表达“流程/结构/关系”，优先尝试图表型来源。
        if (hasDiagramIntent(requirement, sourceMethod)) {
            addPreference(preference,
                    ImageMethodEnum.SVG_DIAGRAM,
                    ImageMethodEnum.MERMAID,
                    ImageMethodEnum.EMOJI_PACK,
                    ImageMethodEnum.PEXELS,
                    ImageMethodEnum.ICONIFY);
            return preference;
        }

        // 原来源无法识别时，按一套通用优先级去兜底。
        if (sourceMethod == null) {
            addPreference(preference,
                    ImageMethodEnum.EMOJI_PACK,
                    ImageMethodEnum.PEXELS,
                    ImageMethodEnum.SVG_DIAGRAM,
                    ImageMethodEnum.MERMAID,
                    ImageMethodEnum.ICONIFY);
            return preference;
        }

        // 原来源可识别时，尽量选“语义上相邻”的备选，而不是简单拿第一个允许值替换。
        switch (sourceMethod) {
            case PEXELS -> addPreference(preference,
                    ImageMethodEnum.EMOJI_PACK,
                    ImageMethodEnum.SVG_DIAGRAM,
                    ImageMethodEnum.MERMAID,
                    ImageMethodEnum.ICONIFY);
            case EMOJI_PACK -> addPreference(preference,
                    ImageMethodEnum.PEXELS,
                    ImageMethodEnum.ICONIFY,
                    ImageMethodEnum.SVG_DIAGRAM,
                    ImageMethodEnum.MERMAID);
            case SVG_DIAGRAM -> addPreference(preference,
                    ImageMethodEnum.MERMAID,
                    ImageMethodEnum.EMOJI_PACK,
                    ImageMethodEnum.ICONIFY,
                    ImageMethodEnum.PEXELS);
            case MERMAID -> addPreference(preference,
                    ImageMethodEnum.SVG_DIAGRAM,
                    ImageMethodEnum.ICONIFY,
                    ImageMethodEnum.EMOJI_PACK,
                    ImageMethodEnum.PEXELS);
            case ICONIFY -> addPreference(preference,
                    ImageMethodEnum.EMOJI_PACK,
                    ImageMethodEnum.SVG_DIAGRAM,
                    ImageMethodEnum.MERMAID,
                    ImageMethodEnum.PEXELS);
            default -> addPreference(preference,
                    ImageMethodEnum.EMOJI_PACK,
                    ImageMethodEnum.PEXELS,
                    ImageMethodEnum.SVG_DIAGRAM,
                    ImageMethodEnum.MERMAID,
                    ImageMethodEnum.ICONIFY);
        }

        return preference;
    }

    private boolean isCoverRequirement(ArticleState.ImageRequirement requirement) {
        return requirement != null && "cover".equalsIgnoreCase(requirement.getType());
    }

    private boolean isCoverPosition(ArticleState.ImageRequirement requirement) {
        return requirement != null && requirement.getPosition() != null && requirement.getPosition() == 1;
    }

    private boolean isIconRequirement(ArticleState.ImageRequirement requirement) {
        if (requirement == null) {
            return false;
        }

        String placeholderId = requirement.getPlaceholderId();
        return StringUtils.hasText(placeholderId) && placeholderId.startsWith("{{ICON_PLACEHOLDER_");
    }

    private boolean hasDiagramIntent(ArticleState.ImageRequirement requirement, ImageMethodEnum sourceMethod) {
        // 来源本来就是图表型时，直接认定为“图表意图”，不用再猜。
        if (sourceMethod == ImageMethodEnum.SVG_DIAGRAM || sourceMethod == ImageMethodEnum.MERMAID) {
            return true;
        }

        if (requirement == null) {
            return false;
        }

        // 用 prompt / keywords / sectionTitle 的混合文本做一次轻量关键词判断。
        String combinedText = String.join(" ",
                        Optional.ofNullable(requirement.getPrompt()).orElse(""),
                        Optional.ofNullable(requirement.getKeywords()).orElse(""),
                        Optional.ofNullable(requirement.getSectionTitle()).orElse(""))
                .toLowerCase(Locale.ROOT);

        if (!StringUtils.hasText(combinedText)) {
            return false;
        }

        return containsAny(combinedText
        );
    }

    private boolean containsAny(String source) {
        // 中英文关键词混合判断，兼容模型有时输出中文、有时输出英文描述。
        for (String keyword : new String[]{"流程", "架构", "关系", "逻辑", "结构",
                "示意", "步骤", "时序", "对比", "路径", "flow", "diagram",
                "architecture", "relationship", "process", "sequence",
                "concept", "mindmap", "chart"}) {
            if (source.contains(keyword)) {
                return true;
            }
        }
        return false;
    }

    private String buildSvgPrompt(ArticleState.ImageRequirement requirement, String mainTitle) {
        // 自动补 SVG prompt 时，优先围绕章节标题或已有关键词生成，避免出现完全泛化的“默认图”。
        String anchor = resolveAnchorText(requirement, mainTitle);
        if (isCoverRequirement(requirement) || isCoverPosition(requirement)) {
            return "绘制一张适合作为文章封面的概念示意图，主题围绕“" + anchor
                    + "”，用简洁节点和连接关系表达核心冲突、转变和结果，不包含精确数据。";
        }
        return "围绕“" + anchor
                + "”绘制一张概念示意图，突出关键关系、对比或成长路径，使用简洁节点和连接线，不包含精确数据。";
    }

    private String buildMermaidPrompt(ArticleState.ImageRequirement requirement, String mainTitle) {
        // 这里给的是最小可运行 Mermaid 骨架，目的是保证下游先能生成，不追求图表绝对精细。
        String anchor = escapeMermaidText(resolveAnchorText(requirement, mainTitle));
        return "flowchart TB\n    A[" + anchor + "] --> B[核心变化]\n    B --> C[问题冲突]\n    B --> D[结果反馈]";
    }

    private String buildEmojiKeywords(ArticleState.ImageRequirement requirement, String mainTitle) {
        String anchor = resolveAnchorText(requirement, mainTitle);
        if (isCoverRequirement(requirement) || isCoverPosition(requirement)) {
            return "搞笑 反差 职场 吐槽";
        }
        return limitKeywordText(anchor + " 搞笑 吐槽 夸张", 24);
    }

    private String buildIconKeywords(ArticleState.ImageRequirement requirement, String mainTitle) {
        String anchor = resolveAnchorText(requirement, mainTitle).toLowerCase(Locale.ROOT);
        if (containsAny(anchor)) {
            return "sitemap";
        }
        return "alert-circle";
    }

    private String buildPexelsKeywords(ArticleState.ImageRequirement requirement, String mainTitle) {
        if (isCoverRequirement(requirement) || isCoverPosition(requirement)) {
            return "office career workplace";
        }
        return "team office workplace stress";
    }

    private String resolveAnchorText(ArticleState.ImageRequirement requirement, String mainTitle) {
        // 自动补字段时，需要一个“主题锚点”：优先章节标题，其次关键词/原 prompt，最后退回主标题。
        if (requirement != null) {
            if (StringUtils.hasText(requirement.getSectionTitle())) {
                return requirement.getSectionTitle().trim();
            }
            if (StringUtils.hasText(requirement.getKeywords())) {
                return requirement.getKeywords().trim();
            }
            if (StringUtils.hasText(requirement.getPrompt())) {
                return requirement.getPrompt().trim();
            }
        }
        if (StringUtils.hasText(mainTitle)) {
            return mainTitle.trim();
        }
        return "文章主题";
    }

    private String limitKeywordText(String text, int maxLength) {
        // 检索词太长通常会降低搜索质量，所以这里截到一个保守长度。
        if (!StringUtils.hasText(text) || text.length() <= maxLength) {
            return text;
        }
        return text.substring(0, maxLength).trim();
    }

    private String escapeMermaidText(String text) {
        // Mermaid 节点文本里出现某些符号时容易破坏语法，这里做最小清洗。
        return Optional.ofNullable(text)
                .orElse("文章主题")
                .replace("\"", "")
                .replace("[", "")
                .replace("]", "")
                .replace("(", "")
                .replace(")", "");
    }

    private void addPreference(List<ImageMethodEnum> preference, ImageMethodEnum... candidates) {
        for (ImageMethodEnum candidate : candidates) {
            if (!preference.contains(candidate)) {
                preference.add(candidate);
            }
        }
    }
}

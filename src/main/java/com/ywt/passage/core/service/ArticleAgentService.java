package com.ywt.passage.core.service;

import com.alibaba.cloud.ai.dashscope.chat.DashScopeChatModel;
import com.google.gson.JsonSyntaxException;
import com.google.gson.reflect.TypeToken;
import com.ywt.passage.annotation.AgentExecution;
import com.ywt.passage.constant.PromptConstant;
import com.ywt.passage.model.dto.article.ArticleState;
import com.ywt.passage.model.dto.image.ImageRequest;
import com.ywt.passage.model.enums.ArticleStyleEnum;
import com.ywt.passage.model.enums.ImageMethodEnum;
import com.ywt.passage.model.enums.SseMessageTypeEnum;
import com.ywt.passage.service.ImageServiceStrategy;
import com.ywt.passage.utils.GsonUtils;
import com.ywt.passage.utils.StylePromptUtil;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.aop.framework.AopContext;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import reactor.core.publisher.Flux;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.function.Consumer;
import java.util.function.Predicate;

/**
 * 文章生成服务 Agent
 */
@Service
@Slf4j
public class ArticleAgentService {

    @Resource
    private DashScopeChatModel chatModel;

    @Resource
    private ImageServiceStrategy imageServiceStrategy;

    /**
     * 阶段1：生成标题方案（3-5个）
     *
     * @param state         文章状态
     * @param streamHandler 流式输出处理器
     */
    public void executePhase1_GenerateTitles(ArticleState state, Consumer<String> streamHandler) {
        try {
            // 智能体1：生成标题方案
            log.info("阶段1：开始生成标题方案, taskId={}", state.getTaskId());
            getProxy().agent1GenerateTitleOptions(state);
            streamHandler.accept(SseMessageTypeEnum.AGENT1_COMPLETE.getValue());
            log.info("阶段1：标题方案生成完成, taskId={}, optionsCount={}",
                    state.getTaskId(), state.getTitleOptions().size());
        } catch (Exception e) {
            log.error("阶段1：标题方案生成失败, taskId={}", state.getTaskId(), e);
            throw new RuntimeException("标题方案生成失败: " + e.getMessage(), e);
        }
    }

    /**
     * 阶段2：生成大纲（用户选择标题后）
     *
     * @param state         文章状态
     * @param streamHandler 流式输出处理器
     */
    public void executePhase2_GenerateOutline(ArticleState state, Consumer<String> streamHandler) {
        try {
            // 智能体2：生成大纲（流式输出）
            log.info("阶段2：开始生成大纲, taskId={}", state.getTaskId());
            getProxy().agent2GenerateOutline(state, streamHandler);
            streamHandler.accept(SseMessageTypeEnum.AGENT2_COMPLETE.getValue());
            log.info("阶段2：大纲生成完成, taskId={}", state.getTaskId());
        } catch (Exception e) {
            log.error("阶段2：大纲生成失败, taskId={}", state.getTaskId(), e);
            throw new RuntimeException("大纲生成失败: " + e.getMessage(), e);
        }
    }

    /**
     * 阶段3：生成正文+配图（用户确认大纲后）
     *
     * @param state         文章状态
     * @param streamHandler 流式输出处理器
     */
    public void executePhase3_GenerateContent(ArticleState state, Consumer<String> streamHandler) {
        try {
            // 获取代理对象
            ArticleAgentService proxy = getProxy();
            // 智能体3：生成正文（流式输出）
            log.info("阶段3：开始生成正文, taskId={}", state.getTaskId());
            proxy.agent3GenerateContent(state, streamHandler);
            streamHandler.accept(SseMessageTypeEnum.AGENT3_COMPLETE.getValue());

            // 智能体4：分析配图需求
            log.info("阶段3：开始分析配图需求, taskId={}", state.getTaskId());
            proxy.agent4AnalyzeImageRequirements(state);
            streamHandler.accept(SseMessageTypeEnum.AGENT4_COMPLETE.getValue());

            // 智能体5：生成配图
            log.info("阶段3：开始生成配图, taskId={}", state.getTaskId());
            proxy.agent5GenerateImages(state, streamHandler);
            streamHandler.accept(SseMessageTypeEnum.AGENT5_COMPLETE.getValue());

            // 图文合成：将配图插入正文
            log.info("阶段3：开始图文合成, taskId={}", state.getTaskId());
            proxy.mergeImagesIntoContent(state);
            streamHandler.accept(SseMessageTypeEnum.MERGE_COMPLETE.getValue());

            log.info("阶段3：正文生成完成, taskId={}", state.getTaskId());
        } catch (Exception e) {
            log.error("阶段3：正文生成失败, taskId={}", state.getTaskId(), e);
            throw new RuntimeException("正文生成失败: " + e.getMessage(), e);
        }
    }


    /**
     * 智能体1：生成标题方案（3-5个）
     */
    @AgentExecution(value = "agent1_generate_titles", description = "生成标题方案")
    public void agent1GenerateTitleOptions(ArticleState state) {
        String prompt = PromptConstant.AGENT1_TITLE_PROMPT
                .replace("{topic}", state.getTopic())
                + StylePromptUtil.getStylePrompt(state.getStyle());

        String content = callLlm(prompt);
        List<ArticleState.TitleOption> titleOptions = parseJsonListResponse(
                content,
                new TypeToken<>() {
                },
                "标题方案"
        );
        state.setTitleOptions(titleOptions);
        log.info("智能体1：标题方案生成成功, optionsCount={}", titleOptions.size());
    }


    /**
     * 智能体2：生成大纲（流式输出）
     */
    @AgentExecution(value = "agent2_generate_outline", description = "生成文章大纲")
    public void agent2GenerateOutline(ArticleState state, Consumer<String> streamHandler) {
        // 构建 prompt，根据是否有用户补充描述插入对应部分
        String descriptionSection = "";
        if (state.getUserDescription() != null && !state.getUserDescription().trim().isEmpty()) {
            descriptionSection = PromptConstant.AGENT2_DESCRIPTION_SECTION
                    .replace("{userDescription}", state.getUserDescription());
        }

        String prompt = PromptConstant.AGENT2_OUTLINE_PROMPT
                .replace("{mainTitle}", state.getTitle().getMainTitle())
                .replace("{subTitle}", state.getTitle().getSubTitle())
                .replace("{descriptionSection}", descriptionSection)
                + StylePromptUtil.getStylePrompt(state.getStyle());

        String content = callLlmWithStreaming(prompt, streamHandler, SseMessageTypeEnum.AGENT2_STREAMING);
        ArticleState.OutlineResult outlineResult = parseJsonResponse(content, ArticleState.OutlineResult.class, "大纲");
        state.setOutline(outlineResult);
        log.info("智能体2：大纲生成成功, sections={}", outlineResult.getSections().size());
    }


    /**
     * 智能体3：生成正文（流式输出）
     */
    @AgentExecution(value = "agent3_generate_content", description = "生成文章正文")
    public void agent3GenerateContent(ArticleState state, Consumer<String> streamHandler) {
        String outlineText = GsonUtils.toJson(state.getOutline().getSections());
        String prompt = PromptConstant.AGENT3_CONTENT_PROMPT
                .replace("{mainTitle}", state.getTitle().getMainTitle())
                .replace("{subTitle}", state.getTitle().getSubTitle())
                .replace("{outline}", outlineText) + StylePromptUtil.getStylePrompt(state.getStyle());

        String content = callLlmWithStreaming(prompt, streamHandler, SseMessageTypeEnum.AGENT3_STREAMING);
        state.setContent(content);
        log.info("智能体3：正文生成成功, length={}", content.length());
    }

    /**
     * 智能体4：分析配图需求（在正文中插入占位符）
     */
    @AgentExecution(value = "agent4_analyze_image_requirements", description = "分析配图需求")
    public void agent4AnalyzeImageRequirements(ArticleState state) {
        List<ImageMethodEnum> allowedMethods = resolveAllowedImageMethods(state.getEnabledImageMethods());

        // 构建可用配图方式说明
        String availableMethods = buildAvailableMethodsDescription(allowedMethods);

        String prompt = PromptConstant.AGENT4_IMAGE_REQUIREMENTS_PROMPT
                .replace("{mainTitle}", state.getTitle().getMainTitle())
                .replace("{content}", state.getContent())
                .replace("{availableMethods}", availableMethods);

        String content = callLlm(prompt);
        ArticleState.Agent4Result agent4Result = parseJsonResponse(
                content,
                ArticleState.Agent4Result.class,
                "配图需求"
        );

        // 二次约束：即使模型越权返回了其他来源，也强制收敛到用户允许的方式。
        enforceAllowedImageRequirements(agent4Result.getImageRequirements(), allowedMethods);

        // 更新正文为包含占位符的版本
        state.setContent(agent4Result.getContentWithPlaceholders());
        state.setImageRequirements(agent4Result.getImageRequirements());
        log.info("智能体4：配图需求分析成功, count={}, 已在正文中插入占位符",
                agent4Result.getImageRequirements().size());
    }

    /**
     * 智能体5：生成配图（串行执行，支持混用多种配图方式，统一上传）
     */
    @AgentExecution(value = "agent5_generate_images", description = "生成配图")
    public void agent5GenerateImages(ArticleState state, Consumer<String> streamHandler) {
        List<ArticleState.ImageResult> imageResults = new ArrayList<>();
        List<ImageMethodEnum> allowedMethods = resolveAllowedImageMethods(state.getEnabledImageMethods());

        for (ArticleState.ImageRequirement requirement : state.getImageRequirements()) {
            ImageMethodEnum finalMethod = ensureRequirementUsesAllowedMethod(requirement, allowedMethods);
            String imageSource = finalMethod.getValue();
            log.info("智能体5：开始获取配图, position={}, imageSource={}, keywords={}",
                    requirement.getPosition(), imageSource, requirement.getKeywords());

            // 构建图片请求对象
            ImageRequest imageRequest = ImageRequest.builder()
                    .keywords(requirement.getKeywords())
                    .prompt(requirement.getPrompt())
                    .position(requirement.getPosition())
                    .type(requirement.getType())
                    .build();

            // 使用策略模式获取图片并统一上传
            ImageServiceStrategy.ImageResult result = imageServiceStrategy.getImageAndUpload(imageSource, imageRequest);

            String storedUrl = result.url();
            ImageMethodEnum method = result.method();

            // 创建配图结果（URL 已经是本地可访问地址）
            ArticleState.ImageResult imageResult = buildImageResult(requirement, storedUrl, method);
            imageResults.add(imageResult);

            // 推送单张配图完成
            String imageCompleteMessage = SseMessageTypeEnum.IMAGE_COMPLETE.getStreamingPrefix() + GsonUtils.toJson(imageResult);
            streamHandler.accept(imageCompleteMessage);

            log.info("智能体5：配图获取并保存成功, position={}, method={}, url={}",
                    requirement.getPosition(), method.getValue(), storedUrl);
        }

        state.setImages(imageResults);
        log.info("智能体5：所有配图生成并保存完成, count={}", imageResults.size());
    }

    /**
     * AI 修改大纲
     *
     * @param mainTitle        主标题
     * @param subTitle         副标题
     * @param currentOutline   当前大纲
     * @param modifySuggestion 用户修改建议
     * @return 修改后的大纲
     */
    @AgentExecution(value = "ai_modify_outline", description = "AI 修改大纲")
    public List<ArticleState.OutlineSection> aiModifyOutline(String mainTitle, String subTitle,
                                                             List<ArticleState.OutlineSection> currentOutline,
                                                             String modifySuggestion) {
        String currentOutlineJson = GsonUtils.toJson(currentOutline);

        String prompt = PromptConstant.AI_MODIFY_OUTLINE_PROMPT
                .replace("{mainTitle}", mainTitle)
                .replace("{subTitle}", subTitle)
                .replace("{currentOutline}", currentOutlineJson)
                .replace("{modifySuggestion}", modifySuggestion);

        String content = callLlm(prompt);
        ArticleState.OutlineResult outlineResult = parseJsonResponse(content, ArticleState.OutlineResult.class, "修改后的大纲");

        log.info("AI修改大纲成功, sectionsCount={}", outlineResult.getSections().size());
        return outlineResult.getSections();
    }

    /**
     * 获取当前类的代理对象
     * 用于解决 Spring AOP 同类方法调用代理失效问题
     */
    private ArticleAgentService getProxy() {
        try {
            return (ArticleAgentService) AopContext.currentProxy();
        } catch (IllegalStateException e) {
            // 如果获取代理失败，返回 this（降级处理）
            log.warn("获取 AOP 代理对象失败，使用原始对象: {}", e.getMessage());
            return this;
        }
    }


    /**
     * 构建可用配图方式说明
     */
    private String buildAvailableMethodsDescription(List<ImageMethodEnum> enabledMethods) {
        // 如果为空或 null，表示支持所有方式
        if (enabledMethods == null || enabledMethods.isEmpty()) {
            return getAllMethodsDescription();
        }

        // 只描述允许的方式
        StringBuilder sb = new StringBuilder();
        for (ImageMethodEnum methodEnum : enabledMethods) {
            sb.append("   - ").append(methodEnum.getValue())
                    .append(": ").append(getMethodUsageDescription(methodEnum))
                    .append("\n");
        }

        if (sb.isEmpty()) {
            return getAllMethodsDescription();
        }

        return sb.toString();
    }

    private List<ImageMethodEnum> resolveAllowedImageMethods(List<String> enabledMethods) {
        if (enabledMethods == null || enabledMethods.isEmpty()) {
            return List.of();
        }

        Set<ImageMethodEnum> allowedSet = new LinkedHashSet<>();
        for (String method : enabledMethods) {
            ImageMethodEnum methodEnum = ImageMethodEnum.getByValue(method);
            if (methodEnum != null && !methodEnum.isFallback()) {
                allowedSet.add(methodEnum);
            }
        }
        return new ArrayList<>(allowedSet);
    }

    private void enforceAllowedImageRequirements(List<ArticleState.ImageRequirement> requirements,
                                                 List<ImageMethodEnum> allowedMethods) {
        if (requirements == null || requirements.isEmpty() || allowedMethods == null || allowedMethods.isEmpty()) {
            return;
        }

        for (ArticleState.ImageRequirement requirement : requirements) {
            ensureRequirementUsesAllowedMethod(requirement, allowedMethods);
        }
    }

    private ImageMethodEnum ensureRequirementUsesAllowedMethod(ArticleState.ImageRequirement requirement,
                                                               List<ImageMethodEnum> allowedMethods) {
        ImageMethodEnum requestedMethod = ImageMethodEnum.getByValue(requirement.getImageSource());

        if (allowedMethods == null || allowedMethods.isEmpty()) {
            ImageMethodEnum fallbackRequested = requestedMethod != null ? requestedMethod : ImageMethodEnum.getDefaultSearchMethod();
            requirement.setImageSource(fallbackRequested.getValue());
            fillMissingRequestFields(requirement, fallbackRequested);
            return fallbackRequested;
        }

        if (requestedMethod != null && allowedMethods.contains(requestedMethod)) {
            fillMissingRequestFields(requirement, requestedMethod);
            return requestedMethod;
        }

        ImageMethodEnum targetMethod = pickPreferredAllowedMethod(requirement, allowedMethods);
        log.warn("配图来源不在允许列表内, requested={}, replaced={}, position={}",
                requirement.getImageSource(), targetMethod.getValue(), requirement.getPosition());

        requirement.setImageSource(targetMethod.getValue());
        fillMissingRequestFields(requirement, targetMethod);
        return targetMethod;
    }

    private ImageMethodEnum pickPreferredAllowedMethod(ArticleState.ImageRequirement requirement,
                                                       List<ImageMethodEnum> allowedMethods) {
        boolean hasPrompt = StringUtils.hasText(requirement.getPrompt());
        boolean hasKeywords = StringUtils.hasText(requirement.getKeywords());

        if (hasPrompt) {
            for (ImageMethodEnum method : allowedMethods) {
                if (method.isAiGenerated()) {
                    return method;
                }
            }
        }

        if (hasKeywords) {
            for (ImageMethodEnum method : allowedMethods) {
                if (!method.isAiGenerated()) {
                    return method;
                }
            }
        }

        return allowedMethods.getFirst();
    }

    private void fillMissingRequestFields(ArticleState.ImageRequirement requirement, ImageMethodEnum method) {
        String fallbackText = StringUtils.hasText(requirement.getSectionTitle())
                ? requirement.getSectionTitle()
                : (StringUtils.hasText(requirement.getType()) ? requirement.getType() : "文章配图");

        if (method.isAiGenerated()) {
            if (!StringUtils.hasText(requirement.getPrompt())) {
                requirement.setPrompt("根据文章语境生成" + fallbackText + "相关示意图");
            }
            if (!StringUtils.hasText(requirement.getKeywords())) {
                requirement.setKeywords("");
            }
            return;
        }

        if (!StringUtils.hasText(requirement.getKeywords())) {
            String defaultKeyword = method == ImageMethodEnum.EMOJI_PACK ? fallbackText + " 表情包" : fallbackText;
            requirement.setKeywords(defaultKeyword);
        }

        if (!StringUtils.hasText(requirement.getPrompt())) {
            requirement.setPrompt("");
        }
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
     * 图文合成：根据占位符将配图插入正文
     */
    private void mergeImagesIntoContent(ArticleState state) {
        String content = state.getContent();
        List<ArticleState.ImageResult> images = state.getImages();

        if (images == null || images.isEmpty()) {
            state.setFullContent(content);
            return;
        }

        String fullContent = content;

        // 遍历所有配图，根据占位符替换为实际图片
        for (ArticleState.ImageResult image : images) {
            String placeholder = image.getPlaceholderId();
            if (placeholder != null && !placeholder.isEmpty()) {
                String imageMarkdown = "![" + image.getDescription() + "](" + image.getUrl() + ")";
                fullContent = fullContent.replace(placeholder, imageMarkdown);
            }
        }

        state.setFullContent(fullContent);
        log.info("图文合成完成, fullContentLength={}", fullContent.length());
    }

    // region 辅助方法

    /**
     * 调用 LLM（非流式）
     */
    private String callLlm(String prompt) {
        ChatResponse response = chatModel.call(new Prompt(new UserMessage(prompt)));
        return response.getResult().getOutput().getText();
    }

    /**
     * 调用 LLM（流式输出）
     */
    private String callLlmWithStreaming(String prompt, Consumer<String> streamHandler, SseMessageTypeEnum messageType) {
        StringBuilder contentBuilder = new StringBuilder();

        Flux<ChatResponse> streamResponse = chatModel.stream(new Prompt(new UserMessage(prompt)));

        streamResponse
                .doOnNext(response -> {
                    String chunk = response.getResult().getOutput().getText();
                    if (chunk != null && !chunk.isEmpty()) {
                        contentBuilder.append(chunk);
                        streamHandler.accept(messageType.getStreamingPrefix() + chunk);
                    }
                })
                .doOnError(error -> log.error("LLM 流式调用失败, messageType={}", messageType, error))
                .blockLast();

        return contentBuilder.toString();
    }


    /**
     * 解析 JSON 响应
     */
    private <T> T parseJsonResponse(String content, Class<T> clazz, String name) {
        Predicate<T> validator = buildValidator(clazz);

        T parsedResult = tryParseJson(content, clazz, validator);
        if (parsedResult != null) {
            return parsedResult;
        }

        String normalized = normalizeJsonContent(content);
        parsedResult = tryParseJson(normalized, clazz, validator);
        if (parsedResult != null) {
            return parsedResult;
        }

        String extractedJson = extractJsonObject(normalized);
        parsedResult = tryParseJson(extractedJson, clazz, validator);
        if (parsedResult != null) {
            return parsedResult;
        }

        String repairedJson = repairCommonJsonSyntax(extractedJson);
        parsedResult = tryParseJson(repairedJson, clazz, validator);
        if (parsedResult != null) {
            log.warn("{}解析使用本地语法修复成功", name);
            return parsedResult;
        }

        String llmRepaired = repairJsonWithLlm(repairedJson, name);
        String llmNormalized = normalizeJsonContent(llmRepaired);
        String llmExtracted = extractJsonObject(llmNormalized);
        String llmRepairedFinal = repairCommonJsonSyntax(llmExtracted);
        parsedResult = tryParseJson(llmRepairedFinal, clazz, validator);
        if (parsedResult != null) {
            log.warn("{}解析使用 LLM 修复成功", name);
            return parsedResult;
        }

        log.error("{}解析失败, originalContent={}", name, content);
        throw new RuntimeException(name + "解析失败");
    }

    /**
     * 解析 JSON 列表响应
     */
    private <T> T parseJsonListResponse(String content, TypeToken<T> typeToken, String name) {
        T parsedResult = tryParseJsonList(content, typeToken);
        if (parsedResult != null) {
            return parsedResult;
        }

        String normalized = normalizeJsonContent(content);
        parsedResult = tryParseJsonList(normalized, typeToken);
        if (parsedResult != null) {
            return parsedResult;
        }

        String extractedJson = extractJsonArray(normalized);
        parsedResult = tryParseJsonList(extractedJson, typeToken);
        if (parsedResult != null) {
            return parsedResult;
        }

        String repairedJson = repairCommonJsonSyntax(extractedJson);
        parsedResult = tryParseJsonList(repairedJson, typeToken);
        if (parsedResult != null) {
            log.warn("{}解析使用本地语法修复成功", name);
            return parsedResult;
        }

        String llmRepaired = repairJsonWithLlm(repairedJson, name);
        String llmNormalized = normalizeJsonContent(llmRepaired);
        String llmExtracted = extractJsonArray(llmNormalized);
        String llmRepairedFinal = repairCommonJsonSyntax(llmExtracted);
        parsedResult = tryParseJsonList(llmRepairedFinal, typeToken);
        if (parsedResult != null) {
            log.warn("{}解析使用 LLM 修复成功", name);
            return parsedResult;
        }

        log.error("{}解析失败, content={}", name, content);
        throw new RuntimeException(name + "解析失败");
    }

    private <T> Predicate<T> buildValidator(Class<T> clazz) {
        if (ArticleState.OutlineResult.class.equals(clazz)) {
            return result -> isValidOutlineResult((ArticleState.OutlineResult) result);
        }
        if (ArticleState.Agent4Result.class.equals(clazz)) {
            return result -> isValidAgent4Result((ArticleState.Agent4Result) result);
        }
        return result -> result != null;
    }

    private <T> T tryParseJson(String json, Class<T> clazz, Predicate<T> validator) {
        if (!StringUtils.hasText(json)) {
            return null;
        }

        try {
            T parsedResult = GsonUtils.fromJson(json, clazz);
            if (parsedResult == null) {
                return null;
            }
            return validator.test(parsedResult) ? parsedResult : null;
        } catch (JsonSyntaxException e) {
            return null;
        }
    }

    private <T> T tryParseJsonList(String json, TypeToken<T> typeToken) {
        if (!StringUtils.hasText(json)) {
            return null;
        }

        try {
            return GsonUtils.fromJson(json, typeToken);
        } catch (JsonSyntaxException e) {
            return null;
        }
    }

    private String normalizeJsonContent(String content) {
        if (!StringUtils.hasText(content)) {
            return content;
        }

        String normalized = content.trim();
        if (normalized.startsWith("```")) {
            normalized = normalized.replaceFirst("^```(?:json)?\\s*", "");
            normalized = normalized.replaceFirst("\\s*```$", "");
        }
        return normalized.trim();
    }

    private String extractJsonObject(String content) {
        if (!StringUtils.hasText(content)) {
            return content;
        }

        int start = content.indexOf('{');
        int end = content.lastIndexOf('}');
        if (start >= 0 && end > start) {
            return content.substring(start, end + 1);
        }
        return content;
    }

    private String extractJsonArray(String content) {
        if (!StringUtils.hasText(content)) {
            return content;
        }

        int start = content.indexOf('[');
        int end = content.lastIndexOf(']');
        if (start >= 0 && end > start) {
            return content.substring(start, end + 1);
        }
        return content;
    }

    private String repairCommonJsonSyntax(String json) {
        if (!StringUtils.hasText(json)) {
            return json;
        }

        String repaired = json
                .replace("\uFEFF", "")
                .replace("“", "\"")
                .replace("”", "\"")
                .replace("‘", "'")
                .replace("’", "'");

        repaired = repaired.replaceAll(",\\s*([}\\]])", "$1");
        repaired = escapeInnerQuotesInJsonStrings(repaired);
        return repaired;
    }

    /**
     * 修复字符串值中未转义的内部引号。
     */
    private String escapeInnerQuotesInJsonStrings(String json) {
        StringBuilder sb = new StringBuilder(json.length() + 16);
        boolean inString = false;
        boolean escaped = false;

        for (int i = 0; i < json.length(); i++) {
            char c = json.charAt(i);

            if (!inString) {
                if (c == '"') {
                    inString = true;
                }
                sb.append(c);
                continue;
            }

            if (escaped) {
                sb.append(c);
                escaped = false;
                continue;
            }

            if (c == '\\') {
                sb.append(c);
                escaped = true;
                continue;
            }

            if (c == '"') {
                char nextSignificant = findNextSignificantChar(json, i + 1);
                boolean isClosingQuote = nextSignificant == ','
                        || nextSignificant == ']'
                        || nextSignificant == '}'
                        || nextSignificant == ':'
                        || nextSignificant == '\0';

                if (isClosingQuote) {
                    inString = false;
                    sb.append(c);
                } else {
                    sb.append('\\').append('"');
                }
                continue;
            }

            sb.append(c);
        }

        return sb.toString();
    }

    private char findNextSignificantChar(String text, int startIndex) {
        for (int i = startIndex; i < text.length(); i++) {
            char c = text.charAt(i);
            if (!Character.isWhitespace(c)) {
                return c;
            }
        }
        return '\0';
    }

    /**
     * 使用 LLM 修复 JSON 语法。
     */
    private String repairJsonWithLlm(String content, String name) {
        if (!StringUtils.hasText(content)) {
            return content;
        }

        String prompt = """
                你是一名严格的 JSON 修复助手。
                
                请把下面这段本应为 JSON 的内容修复成严格合法的 JSON。
                要求：
                1. 只能修复 JSON 语法问题，例如多余引号、缺失冒号、尾随逗号、markdown 包裹。
                2. 不要改动字段名、字段层级和原始语义。
                3. 不要补充解释，不要输出 markdown 代码块。
                4. 只返回修复后的 JSON 文本。
                
                内容类型：%s
                原始内容：
                %s
                """.formatted(name, content);

        try {
            return callLlm(prompt);
        } catch (Exception e) {
            log.warn("{} JSON 修复调用失败，将按原内容继续报错", name, e);
            return content;
        }
    }

    private boolean isValidOutlineResult(ArticleState.OutlineResult result) {
        if (result == null || result.getSections() == null || result.getSections().isEmpty()) {
            return false;
        }

        for (ArticleState.OutlineSection section : result.getSections()) {
            if (section == null
                    || section.getSection() == null
                    || !StringUtils.hasText(section.getTitle())
                    || section.getPoints() == null
                    || section.getPoints().isEmpty()) {
                return false;
            }
        }
        return true;
    }

    /**
     * 校验配图需求解析结果。
     */
    private boolean isValidAgent4Result(ArticleState.Agent4Result result) {
        return result != null
                && StringUtils.hasText(result.getContentWithPlaceholders())
                && result.getImageRequirements() != null;
    }

    /**
     * 构建配图结果
     */
    private ArticleState.ImageResult buildImageResult(ArticleState.ImageRequirement requirement,
                                                      String imageUrl,
                                                      ImageMethodEnum method) {
        ArticleState.ImageResult imageResult = new ArticleState.ImageResult();
        imageResult.setPosition(requirement.getPosition());
        imageResult.setUrl(imageUrl);
        imageResult.setMethod(method.getValue());
        imageResult.setKeywords(requirement.getKeywords());
        imageResult.setSectionTitle(requirement.getSectionTitle());
        imageResult.setPlaceholderId(requirement.getPlaceholderId());  // 记录占位符ID
        imageResult.setDescription(requirement.getType());
        return imageResult;
    }

// endregion
}

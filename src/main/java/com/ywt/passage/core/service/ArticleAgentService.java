package com.ywt.passage.core.service;

import com.alibaba.cloud.ai.dashscope.chat.DashScopeChatModel;
import com.google.gson.JsonSyntaxException;
import com.ywt.passage.constant.PromptConstant;
import com.ywt.passage.model.dto.article.ArticleState;
import com.ywt.passage.model.dto.image.ImageRequest;
import com.ywt.passage.model.enums.ArticleStyleEnum;
import com.ywt.passage.model.enums.ImageMethodEnum;
import com.ywt.passage.model.enums.SseMessageTypeEnum;
import com.ywt.passage.service.ImageServiceStrategy;
import com.ywt.passage.utils.GsonUtils;
import com.ywt.passage.utils.LlmJsonUtils;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import reactor.core.publisher.Flux;

import java.util.ArrayList;
import java.util.List;
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
     * 执行完整的文章生成流程
     *
     * @param state         文章状态
     * @param streamHandler 流式输出处理器
     */
    public void executeArticleGeneration(ArticleState state, Consumer<String> streamHandler) {
        try {
            // 智能体1：生成标题
            log.info("智能体1：开始生成标题, taskId={}", state.getTaskId());
            agent1GenerateTitle(state);
            streamHandler.accept(SseMessageTypeEnum.AGENT1_COMPLETE.getValue());

            // 智能体2：生成大纲（流式输出）
            log.info("智能体2：开始生成大纲, taskId={}", state.getTaskId());
            agent2GenerateOutline(state, streamHandler);
            streamHandler.accept(SseMessageTypeEnum.AGENT2_COMPLETE.getValue());

            // 智能体3：生成正文（流式输出）
            log.info("智能体3：开始生成正文, taskId={}", state.getTaskId());
            agent3GenerateContent(state, streamHandler);
            streamHandler.accept(SseMessageTypeEnum.AGENT3_COMPLETE.getValue());

            // 智能体4：分析配图需求
            log.info("智能体4：开始分析配图需求, taskId={}", state.getTaskId());
            agent4AnalyzeImageRequirements(state);
            streamHandler.accept(SseMessageTypeEnum.AGENT4_COMPLETE.getValue());

            // 智能体5：生成配图
            log.info("智能体5：开始生成配图, taskId={}", state.getTaskId());
            agent5GenerateImages(state, streamHandler);
            streamHandler.accept(SseMessageTypeEnum.AGENT5_COMPLETE.getValue());

            // 图文合成：将配图插入正文
            log.info("开始图文合成, taskId={}", state.getTaskId());
            mergeImagesIntoContent(state);
            streamHandler.accept(SseMessageTypeEnum.MERGE_COMPLETE.getValue());

            log.info("文章生成完成, taskId={}", state.getTaskId());
        } catch (Exception e) {
            log.error("文章生成失败, taskId={}", state.getTaskId(), e);
            throw new RuntimeException("文章生成失败: " + e.getMessage(), e);
        }
    }


    /**
     * 智能体1：生成标题
     */
    private void agent1GenerateTitle(ArticleState state) {
        String prompt = PromptConstant.AGENT1_TITLE_PROMPT
                .replace("{topic}", state.getTopic())
                + getStylePrompt(state.getStyle());

        // 调用 LLM
        String content = callLlm(prompt);
        ArticleState.TitleResult titleResult = parseJsonResponse(
                content,
                ArticleState.TitleResult.class,
                "标题",
                result -> result != null
                        && StringUtils.hasText(result.getMainTitle())
                        && StringUtils.hasText(result.getSubTitle())
        );
        state.setTitle(titleResult);
        log.info("智能体1：标题生成成功, mainTitle={}", titleResult.getMainTitle());
    }

    /**
     * 智能体2：生成大纲（流式输出）
     */
    private void agent2GenerateOutline(ArticleState state, Consumer<String> streamHandler) {
        String prompt = PromptConstant.AGENT2_OUTLINE_PROMPT
                .replace("{mainTitle}", state.getTitle().getMainTitle())
                .replace("{subTitle}", state.getTitle().getSubTitle())
                + getStylePrompt(state.getStyle());

        // 调用 LLM（流式输出）
        String content = callLlmWithStreaming(prompt, streamHandler, SseMessageTypeEnum.AGENT2_STREAMING);
        ArticleState.OutlineResult outlineResult = parseJsonResponse(
                content,
                ArticleState.OutlineResult.class,
                "大纲",
                this::isValidOutlineResult
        );
        state.setOutline(outlineResult);
        log.info("智能体2：大纲生成成功, sections={}", outlineResult.getSections().size());
    }

    /**
     * 智能体3：生成正文（流式输出）
     */
    private void agent3GenerateContent(ArticleState state, Consumer<String> streamHandler) {
        String outlineText = GsonUtils.toJson(state.getOutline().getSections());
        String prompt = PromptConstant.AGENT3_CONTENT_PROMPT
                .replace("{mainTitle}", state.getTitle().getMainTitle())
                .replace("{subTitle}", state.getTitle().getSubTitle())
                .replace("{outline}", outlineText) + getStylePrompt(state.getStyle());

        String content = callLlmWithStreaming(prompt, streamHandler, SseMessageTypeEnum.AGENT3_STREAMING);
        state.setContent(content);
        log.info("智能体3：正文生成成功, length={}", content.length());
    }

    /**
     * 智能体4：分析配图需求（在正文中插入占位符）
     */
    private void agent4AnalyzeImageRequirements(ArticleState state) {
        // 构建可用配图方式说明
        String availableMethods = buildAvailableMethodsDescription(state.getEnabledImageMethods());

        String prompt = PromptConstant.AGENT4_IMAGE_REQUIREMENTS_PROMPT
                .replace("{mainTitle}", state.getTitle().getMainTitle())
                .replace("{content}", state.getContent())
                .replace("{availableMethods}", availableMethods);

        String content = callLlm(prompt);
        ArticleState.Agent4Result agent4Result = parseJsonResponse(
                content,
                ArticleState.Agent4Result.class,
                "配图需求",
                this::isValidAgent4Result
        );

        // 更新正文为包含占位符的版本
        state.setContent(agent4Result.getContentWithPlaceholders());
        state.setImageRequirements(agent4Result.getImageRequirements());
        log.info("智能体4：配图需求分析成功, count={}, 已在正文中插入占位符",
                agent4Result.getImageRequirements().size());
    }

    /**
     * 智能体5：生成配图（串行执行，支持混用多种配图方式，统一上传）
     */
    private void agent5GenerateImages(ArticleState state, Consumer<String> streamHandler) {
        List<ArticleState.ImageResult> imageResults = new ArrayList<>();

        for (ArticleState.ImageRequirement requirement : state.getImageRequirements()) {
            String imageSource = requirement.getImageSource();
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
     * 构建可用配图方式说明
     */
    private String buildAvailableMethodsDescription(List<String> enabledMethods) {
        // 如果为空或 null，表示支持所有方式
        if (enabledMethods == null || enabledMethods.isEmpty()) {
            return getAllMethodsDescription();
        }

        // 只描述允许的方式
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
    private <T> T parseJsonResponse(String content, Class<T> clazz, String name, Predicate<T> validator) {
        String normalizedContent = LlmJsonUtils.normalizeJsonContent(content);
        String repairedContent = LlmJsonUtils.repairJsonContent(normalizedContent);

        T parsedResult = tryParseJson(repairedContent, clazz, validator);
        if (parsedResult != null) {
            if (!repairedContent.equals(normalizedContent)) {
                log.warn("{}存在轻微 JSON 语法问题，已自动修复后解析", name);
            }
            return parsedResult;
        }

        String llmRepairedContent = repairJsonWithLlm(repairedContent, name);
        String normalizedLlmRepairedContent = LlmJsonUtils.repairJsonContent(
                LlmJsonUtils.normalizeJsonContent(llmRepairedContent)
        );

        parsedResult = tryParseJson(normalizedLlmRepairedContent, clazz, validator);
        if (parsedResult != null) {
            log.warn("{}原始 JSON 非法，已通过 LLM 修复后解析成功", name);
            return parsedResult;
        }

        log.error("{}解析失败, originalContent={}, normalizedContent={}, repairedContent={}, llmRepairedContent={}",
                name, content, normalizedContent, repairedContent, normalizedLlmRepairedContent);
        throw new RuntimeException(name + "解析失败");
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

    /**
     * 根据风格获取对应的prompt提示增加
     */
    private String getStylePrompt(String style) {
        if (style == null || style.isEmpty()) {
            return "";
        }

        ArticleStyleEnum styleEnum = ArticleStyleEnum.getEnumByValue(style);
        if (styleEnum == null) {
            return "";
        }

        return switch (styleEnum) {
            case TECH -> PromptConstant.STYLE_TECH_PROMPT;
            case EMOTIONAL -> PromptConstant.STYLE_EMOTIONAL_PROMPT;
            case EDUCATIONAL -> PromptConstant.STYLE_EDUCATIONAL_PROMPT;
            case HUMOROUS -> PromptConstant.STYLE_HUMOROUS_PROMPT;
        };
    }

// endregion
}

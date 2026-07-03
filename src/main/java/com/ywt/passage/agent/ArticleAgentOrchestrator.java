package com.ywt.passage.agent;

import com.alibaba.cloud.ai.graph.*;
import com.alibaba.cloud.ai.graph.exception.GraphStateException;
import com.alibaba.cloud.ai.graph.state.strategy.ReplaceStrategy;
import com.ywt.passage.agent.agents.*;
import com.ywt.passage.agent.parallel.ParallelImageGenerator;
import com.ywt.passage.model.dto.article.ArticleState;
import com.ywt.passage.model.enums.SseMessageTypeEnum;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Consumer;

import static com.alibaba.cloud.ai.graph.StateGraph.END;
import static com.alibaba.cloud.ai.graph.StateGraph.START;
import static com.alibaba.cloud.ai.graph.action.AsyncEdgeAction.edge_async;
import static com.alibaba.cloud.ai.graph.action.AsyncNodeAction.node_async;

/**
 * 文章智能体编排器
 * 使用 Spring AI Alibaba 的 StateGraph 编排多个 Agent
 */
@Service
@Slf4j
public class ArticleAgentOrchestrator {

    private static final String KEY_TASK_ID = "taskId";
    private static final String KEY_TOPIC = "topic";
    private static final String KEY_STYLE = "style";
    private static final String KEY_USER_DESCRIPTION = "userDescription";
    private static final String KEY_MAIN_TITLE = "mainTitle";
    private static final String KEY_SUB_TITLE = "subTitle";
    private static final String KEY_TITLE_OPTIONS = "titleOptions";

    // region 状态键常量
    private static final String KEY_OUTLINE = "outline";
    private static final String KEY_CONTENT = "content";
    private static final String KEY_CONTENT_WITH_PLACEHOLDERS = "contentWithPlaceholders";
    private static final String KEY_IMAGE_REQUIREMENTS = "imageRequirements";
    private static final String KEY_IMAGES = "images";
    private static final String KEY_FULL_CONTENT = "fullContent";
    private static final String KEY_ENABLED_IMAGE_METHODS = "enabledImageMethods";
    private static final String KEY_CONTENT_SCORE = "contentScore";
    private static final String KEY_EVALUATION_FEEDBACK = "evaluationFeedback";
    private static final String KEY_ENHANCEMENT_ROUND = "enhancementRound";
    /**
     * 标题生成
     */
    @Resource
    private TitleGeneratorAgent titleGeneratorAgent;
    /**
     * 大纲生成
     */
    @Resource
    private OutlineGeneratorAgent outlineGeneratorAgent;
    /**
     * 内容生成
     */
    @Resource
    private ContentGeneratorAgent contentGeneratorAgent;
    /**
     * 内容评估
     */
    @Resource
    private ContentEvaluatorAgent contentEvaluatorAgent;
    /**
     * 内容增强
     */
    @Resource
    private ContentEnhancerAgent contentEnhancerAgent;
    /**
     * 图片分析
     */
    @Resource
    private ImageAnalyzerAgent imageAnalyzerAgent;
    /**
     * 图片生成（并行）
     */
    @Resource
    private ParallelImageGenerator parallelImageGenerator;
    /**
     * 图文合并
     */
    @Resource
    private ContentMergerAgent contentMergerAgent;

    // endregion

    /**
     * 阶段1：生成标题方案
     */
    public void executePhase1_GenerateTitles(ArticleState state, Consumer<String> streamHandler) {
        log.info("阶段1（多智能体编排）：开始生成标题方案, taskId={}", state.getTaskId());

        try {
            // 构建输入状态
            Map<String, Object> inputs = new HashMap<>();
            inputs.put(KEY_TASK_ID, state.getTaskId());
            inputs.put(KEY_TOPIC, state.getTopic());
            inputs.put(KEY_STYLE, state.getStyle());

            // 构建并执行图
            StateGraph graph = buildPhase1Graph();
            CompiledGraph compiledGraph = graph.compile();

            Optional<OverAllState> result = compiledGraph.invoke(inputs);

            if (result.isPresent()) {
                OverAllState finalState = result.get();

                @SuppressWarnings("unchecked")
                List<ArticleState.TitleOption> titleOptions = (List<ArticleState.TitleOption>) finalState.value(KEY_TITLE_OPTIONS).orElse(null);

                if (titleOptions != null) {
                    state.setTitleOptions(titleOptions);
                    streamHandler.accept(SseMessageTypeEnum.AGENT1_COMPLETE.getValue());
                    log.info("阶段1（多智能体编排）：标题方案生成完成, 数量={}", titleOptions.size());
                } else {
                    throw new RuntimeException("标题方案生成失败：结果为空");
                }
            } else {
                throw new RuntimeException("标题方案生成失败：执行结果为空");
            }

        } catch (Exception e) {
            log.error("阶段1（多智能体编排）：标题方案生成失败, taskId={}", state.getTaskId(), e);
            throw new RuntimeException("标题方案生成失败: " + e.getMessage(), e);
        }
    }

    /**
     * 阶段2：生成大纲
     */
    public void executePhase2_GenerateOutline(ArticleState state, Consumer<String> streamHandler) {
        log.info("阶段2（多智能体编排）：开始生成大纲, taskId={}", state.getTaskId());

        // 设置流式处理器到 ThreadLocal
        StreamHandlerContext.set(streamHandler);

        try {
            Map<String, Object> inputs = new HashMap<>();
            inputs.put(KEY_TASK_ID, state.getTaskId());
            inputs.put(KEY_MAIN_TITLE, state.getTitle().getMainTitle());
            inputs.put(KEY_SUB_TITLE, state.getTitle().getSubTitle());
            inputs.put(KEY_USER_DESCRIPTION, state.getUserDescription());
            inputs.put(KEY_STYLE, state.getStyle());

            StateGraph graph = buildPhase2Graph();
            CompiledGraph compiledGraph = graph.compile();

            Optional<OverAllState> result = compiledGraph.invoke(inputs);

            if (result.isPresent()) {
                OverAllState finalState = result.get();

                ArticleState.OutlineResult outline = finalState.value(KEY_OUTLINE)
                        .map(v -> {
                            if (v instanceof ArticleState.OutlineResult) {
                                return (ArticleState.OutlineResult) v;
                            }
                            return null;
                        })
                        .orElse(null);

                if (outline != null) {
                    state.setOutline(outline);
                    streamHandler.accept(SseMessageTypeEnum.AGENT2_COMPLETE.getValue());
                    log.info("阶段2（多智能体编排）：大纲生成完成, 章节数={}", outline.getSections().size());
                } else {
                    throw new RuntimeException("大纲生成失败：结果为空");
                }
            } else {
                throw new RuntimeException("大纲生成失败：执行结果为空");
            }

        } catch (Exception e) {
            log.error("阶段2（多智能体编排）：大纲生成失败, taskId={}", state.getTaskId(), e);
            throw new RuntimeException("大纲生成失败: " + e.getMessage(), e);
        } finally {
            // 清理 ThreadLocal
            StreamHandlerContext.clear();
        }
    }

    /**
     * 阶段3：生成正文+配图
     */
    public void executePhase3_GenerateContent(ArticleState state, Consumer<String> streamHandler) {
        log.info("阶段3（多智能体编排）：开始生成正文+配图, taskId={}", state.getTaskId());

        // 设置流式处理器到 ThreadLocal
        StreamHandlerContext.set(streamHandler);

        try {
            Map<String, Object> inputs = new HashMap<>();
            inputs.put(KEY_TASK_ID, state.getTaskId());
            inputs.put(KEY_MAIN_TITLE, state.getTitle().getMainTitle());
            inputs.put(KEY_SUB_TITLE, state.getTitle().getSubTitle());
            inputs.put(KEY_OUTLINE, state.getOutline());
            inputs.put(KEY_STYLE, state.getStyle());
            inputs.put(KEY_ENABLED_IMAGE_METHODS, state.getEnabledImageMethods());
            inputs.put(KEY_ENHANCEMENT_ROUND, 0);  // 初始增强轮次为 0

            StateGraph graph = buildPhase3Graph();
            CompiledGraph compiledGraph = graph.compile();

            Optional<OverAllState> result = compiledGraph.invoke(inputs);

            if (result.isPresent()) {
                OverAllState finalState = result.get();

                // 提取带占位符的正文
                String contentWithPlaceholders = finalState.value(KEY_CONTENT_WITH_PLACEHOLDERS)
                        .map(Object::toString)
                        .orElse(null);

                String content = finalState.value(KEY_CONTENT)
                        .map(Object::toString)
                        .orElse(null);

                @SuppressWarnings("unchecked")
                List<ArticleState.ImageRequirement> imageRequirements = (List<ArticleState.ImageRequirement>) finalState.value(KEY_IMAGE_REQUIREMENTS).orElse(null);

                @SuppressWarnings("unchecked")
                List<ArticleState.ImageResult> images = (List<ArticleState.ImageResult>) finalState.value(KEY_IMAGES).orElse(null);

                String fullContent = finalState.value(KEY_FULL_CONTENT)
                        .map(Object::toString)
                        .orElse(null);

                // 更新状态
                if (contentWithPlaceholders != null) {
                    state.setContent(contentWithPlaceholders);
                } else if (content != null) {
                    state.setContent(content);
                }

                if (imageRequirements != null) {
                    state.setImageRequirements(imageRequirements);
                }

                if (images != null) {
                    state.setImages(images);
                    streamHandler.accept(SseMessageTypeEnum.AGENT5_COMPLETE.getValue());
                }

                if (fullContent != null) {
                    state.setFullContent(fullContent);
                    streamHandler.accept(SseMessageTypeEnum.MERGE_COMPLETE.getValue());
                }

                log.info("阶段3（多智能体编排）：正文+配图生成完成, 正文长度={}, 图片数={}",
                        contentWithPlaceholders != null ? contentWithPlaceholders.length() : 0,
                        images != null ? images.size() : 0);

            } else {
                throw new RuntimeException("正文+配图生成失败：执行结果为空");
            }

        } catch (Exception e) {
            log.error("阶段3（多智能体编排）：正文+配图生成失败, taskId={}", state.getTaskId(), e);
            throw new RuntimeException("正文+配图生成失败: " + e.getMessage(), e);
        } finally {
            StreamHandlerContext.clear();
        }
    }

    // region 构建图

    /**
     * 构建阶段1图：标题生成
     */
    private StateGraph buildPhase1Graph() throws GraphStateException {
        KeyStrategyFactory keyStrategyFactory = createKeyStrategyFactory();

        return new StateGraph(keyStrategyFactory)
                .addNode("title_generator", node_async(titleGeneratorAgent))
                .addEdge(START, "title_generator")
                .addEdge("title_generator", END);
    }

    /**
     * 构建阶段2图：大纲生成
     */
    private StateGraph buildPhase2Graph() throws GraphStateException {
        KeyStrategyFactory keyStrategyFactory = createKeyStrategyFactory();

        return new StateGraph(keyStrategyFactory)
                .addNode("outline_generator", node_async(outlineGeneratorAgent))
                .addEdge(START, "outline_generator")
                .addEdge("outline_generator", END);
    }

    /**
     * 构建阶段 3 图：正文生成 → 质量评估（条件分支） → 配图需求分析 → 并行配图生成 → 图文合成
     * <p>
     * 条件分支逻辑：
     * content_evaluator 输出 contentScore
     * ├─ score ≥ 7 → 通过 → image_analyzer → parallel_image_generator → content_merger → END
     * └─ score < 7 → 不通过 → content_enhancer → content_evaluator（重新评估，最多 2 轮）
     * 第 2 轮（round ≥ 1）评估器直接返回满分 10 强制通过 + 路由层 round ≥ 2 二次保险，杜绝死循环
     */
    private StateGraph buildPhase3Graph() throws GraphStateException {
        KeyStrategyFactory keyStrategyFactory = createKeyStrategyFactory();

        return new StateGraph(keyStrategyFactory)
                // 节点定义
                .addNode("content_generator", node_async(contentGeneratorAgent))
                .addNode("content_evaluator", node_async(contentEvaluatorAgent))
                .addNode("content_enhancer", node_async(contentEnhancerAgent))
                .addNode("image_analyzer", node_async(imageAnalyzerAgent))
                .addNode("parallel_image_generator", node_async(parallelImageGenerator))
                .addNode("content_merger", node_async(contentMergerAgent))
                // 边定义
                .addEdge(START, "content_generator")
                .addEdge("content_generator", "content_evaluator")
                // ★ 条件分支：content_evaluator → image_analyzer 或 content_enhancer
                .addConditionalEdges("content_evaluator",
                        edge_async(state -> {
                            // 从 state中读取评估分数和增强轮次
                            Integer score = state.value(KEY_CONTENT_SCORE)
                                    .map(v -> Integer.parseInt(v.toString()))
                                    .orElse(7);//默认通过
                            Integer round = state.value("enhancementRound")
                                    .map(v -> Integer.parseInt(v.toString()))
                                    .orElse(0);
                            // 第 2 轮及以上强制通过，避免死循环
                            if (round >= 2) {
                                log.info("条件分支路由: 第{}轮强制通过, 路由到 image_analyzer", round);
                                return "image_analyzer";
                            }
                            log.info("条件分支路由: contentScore={}, 路由到 {}",
                                    score, score >= 7 ? "image_analyzer" : "content_enhancer");
                            return score >= 7 ? "image_analyzer" : "content_enhancer";
                        }), Map.of(
                                "image_analyzer", "image_analyzer",
                                "content_enhancer", "content_enhancer"
                        ))
                // content_enhancer → content_evaluator（循环回去重新评估）
                .addEdge("content_enhancer", "content_evaluator")
                // 通过后的线性链
                .addEdge("image_analyzer", "parallel_image_generator")
                .addEdge("parallel_image_generator", "content_merger")
                .addEdge("content_merger", END);
    }

    /**
     * 创建状态键策略工厂
     * 所有键都使用替换策略
     */
    private KeyStrategyFactory createKeyStrategyFactory() {
        return () -> {
            HashMap<String, KeyStrategy> strategies = new HashMap<>();
            strategies.put(KEY_TASK_ID, new ReplaceStrategy());
            strategies.put(KEY_TOPIC, new ReplaceStrategy());
            strategies.put(KEY_STYLE, new ReplaceStrategy());
            strategies.put(KEY_USER_DESCRIPTION, new ReplaceStrategy());
            strategies.put(KEY_MAIN_TITLE, new ReplaceStrategy());
            strategies.put(KEY_SUB_TITLE, new ReplaceStrategy());
            strategies.put(KEY_TITLE_OPTIONS, new ReplaceStrategy());
            strategies.put(KEY_OUTLINE, new ReplaceStrategy());
            strategies.put(KEY_CONTENT, new ReplaceStrategy());
            strategies.put(KEY_CONTENT_WITH_PLACEHOLDERS, new ReplaceStrategy());
            strategies.put(KEY_IMAGE_REQUIREMENTS, new ReplaceStrategy());
            strategies.put(KEY_IMAGES, new ReplaceStrategy());
            strategies.put(KEY_FULL_CONTENT, new ReplaceStrategy());
            strategies.put(KEY_ENABLED_IMAGE_METHODS, new ReplaceStrategy());
            strategies.put(KEY_CONTENT_SCORE, new ReplaceStrategy());
            strategies.put(KEY_EVALUATION_FEEDBACK, new ReplaceStrategy());
            strategies.put(KEY_ENHANCEMENT_ROUND, new ReplaceStrategy());
            return strategies;
        };
    }

    // endregion
}

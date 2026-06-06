package com.ywt.passage.agent;

import com.ywt.passage.agent.agents.*;
import com.ywt.passage.agent.parallel.ParallelImageGenerator;
import com.ywt.passage.model.dto.article.ArticleState;
import com.ywt.passage.model.enums.SseMessageTypeEnum;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Consumer;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * ArticleAgentOrchestrator 单元测试
 * 使用 Mockito mock 所有 Agent，验证编排器的阶段执行与错误处理逻辑。
 * <p>
 * 核心策略：Agent 实现 NodeAction 接口，apply(OverAllState) 返回 Map。
 * 通过 doAnswer 让 mock agent 向 graph state 写入预期输出，
 * 从而驱动编排器的状态更新逻辑。
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("ArticleAgentOrchestrator — 文章智能体编排器")
class ArticleAgentOrchestratorTest {

    @Mock
    private TitleGeneratorAgent titleGeneratorAgent;
    @Mock
    private OutlineGeneratorAgent outlineGeneratorAgent;
    @Mock
    private ContentGeneratorAgent contentGeneratorAgent;
    @Mock
    private ImageAnalyzerAgent imageAnalyzerAgent;
    @Mock
    private ParallelImageGenerator parallelImageGenerator;
    @Mock
    private ContentMergerAgent contentMergerAgent;

    @InjectMocks
    private ArticleAgentOrchestrator orchestrator;

    private ArticleState state;
    private List<String> sseMessages;
    private Consumer<String> streamHandler;

    @BeforeEach
    void setUp() {
        state = new ArticleState();
        state.setTaskId("test-task-001");
        state.setTopic("AI 对教育行业的影响");
        state.setStyle("tech");
        state.setUserDescription("面向技术读者的深度分析");

        sseMessages = new ArrayList<>();
        streamHandler = sseMessages::add;
    }

    // ==================== Phase 1：标题生成 ====================

    @Nested
    @DisplayName("Phase 1 — 标题方案生成")
    class Phase1Test {

        @Test
        @DisplayName("正常输入 → 生成标题方案，状态更新正确")
        void 正常输入_生成标题方案() {
            // 模拟 TitleGeneratorAgent 向 graph state 写入标题方案
            ArticleState.TitleOption option1 = new ArticleState.TitleOption();
            option1.setMainTitle("AI 如何重塑教育");
            option1.setSubTitle("从个性化学习到智能辅导");

            ArticleState.TitleOption option2 = new ArticleState.TitleOption();
            option2.setMainTitle("教育 AI 时代的机遇与挑战");
            option2.setSubTitle("技术驱动下的教育变革");

            List<ArticleState.TitleOption> options = List.of(option1, option2);

            doAnswer(invocation -> {
                Map<String, Object> output = new HashMap<>();
                output.put("titleOptions", options);
                return output;
            }).when(titleGeneratorAgent).apply(any());

            // 执行
            orchestrator.executePhase1_GenerateTitles(state, streamHandler);

            // 验证状态
            assertNotNull(state.getTitleOptions(), "标题方案列表不应为 null");
            assertEquals(2, state.getTitleOptions().size(), "应生成 2 个标题方案");
            assertEquals("AI 如何重塑教育", state.getTitleOptions().get(0).getMainTitle());
            assertEquals("教育 AI 时代的机遇与挑战", state.getTitleOptions().get(1).getMainTitle());

            // 验证 SSE 通知
            assertEquals(1, sseMessages.size());
            assertEquals(SseMessageTypeEnum.AGENT1_COMPLETE.getValue(), sseMessages.get(0));
        }

        @Test
        @DisplayName("Agent 返回空标题方案 → 抛出 RuntimeException")
        void agent返回空标题_抛出异常() {
            // titleOptions 为 null 时触发异常
            doAnswer(invocation -> Map.of("titleOptions", null))
                    .when(titleGeneratorAgent).apply(any());

            RuntimeException ex = assertThrows(RuntimeException.class,
                    () -> orchestrator.executePhase1_GenerateTitles(state, streamHandler));

            assertTrue(ex.getMessage().contains("标题方案生成失败"));
            assertTrue(sseMessages.isEmpty(), "失败时不应发送完成通知");
        }

        @Test
        @DisplayName("Agent 抛出异常 → 异常被包装为 RuntimeException")
        void agent抛出异常_包装抛出() {
            doThrow(new RuntimeException("LLM 调用超时"))
                    .when(titleGeneratorAgent).apply(any());

            RuntimeException ex = assertThrows(RuntimeException.class,
                    () -> orchestrator.executePhase1_GenerateTitles(state, streamHandler));

            assertTrue(ex.getMessage().contains("标题方案生成失败"));
            assertTrue(ex.getMessage().contains("LLM 调用超时"));
            assertTrue(sseMessages.isEmpty());
        }
    }

    // ==================== Phase 2：大纲生成 ====================

    @Nested
    @DisplayName("Phase 2 — 大纲生成")
    class Phase2Test {

        @Test
        @DisplayName("正常输入 → 生成大纲，状态更新正确")
        void 正常输入_生成大纲() throws Exception {
            // 先设置标题（Phase 2 依赖 Phase 1 的标题结果）
            ArticleState.TitleResult titleResult = new ArticleState.TitleResult();
            titleResult.setMainTitle("AI 如何重塑教育");
            titleResult.setSubTitle("从个性化学习到智能辅导");
            state.setTitle(titleResult);

            // 构造大纲结果
            ArticleState.OutlineResult outlineResult = new ArticleState.OutlineResult();
            ArticleState.OutlineSection section1 = new ArticleState.OutlineSection();
            section1.setSection(1);
            section1.setTitle("AI 教育现状");
            ArticleState.OutlineSection section2 = new ArticleState.OutlineSection();
            section2.setSection(2);
            section2.setTitle("未来趋势");
            outlineResult.setSections(List.of(section1, section2));

            doAnswer(invocation -> {
                Map<String, Object> output = new HashMap<>();
                output.put("outline", outlineResult);
                return output;
            }).when(outlineGeneratorAgent).apply(any());

            // 执行
            orchestrator.executePhase2_GenerateOutline(state, streamHandler);

            // 验证状态
            assertNotNull(state.getOutline(), "大纲不应为 null");
            assertEquals(2, state.getOutline().getSections().size());
            assertEquals("AI 教育现状", state.getOutline().getSections().get(0).getTitle());

            // 验证 SSE 通知
            assertEquals(1, sseMessages.size());
            assertEquals(SseMessageTypeEnum.AGENT2_COMPLETE.getValue(), sseMessages.get(0));
        }

        @Test
        @DisplayName("Agent 返回空大纲 → 抛出 RuntimeException")
        void agent返回空大纲_抛出异常() throws Exception {
            ArticleState.TitleResult titleResult = new ArticleState.TitleResult();
            titleResult.setMainTitle("Test");
            titleResult.setSubTitle("Test");
            state.setTitle(titleResult);

            doAnswer(invocation -> Map.of("outline", null))
                    .when(outlineGeneratorAgent).apply(any());

            assertThrows(RuntimeException.class,
                    () -> orchestrator.executePhase2_GenerateOutline(state, streamHandler));
        }
    }

    // ==================== Phase 3：正文+配图 ====================

    @Nested
    @DisplayName("Phase 3 — 正文+配图生成")
    class Phase3Test {

        @Test
        @DisplayName("正常输入 → 正文、配图需求、配图结果、完整内容全部填充")
        void 正常输入_全文生成() throws Exception {
            // 预置 Phase 2 产出的大纲
            setupStateForPhase3();

            // Mock 4 个 Agent 按阶段写入输出
            // 1) ContentGeneratorAgent → contentWithPlaceholders + imageRequirements
            ArticleState.ImageRequirement req1 = new ArticleState.ImageRequirement();
            req1.setPosition(1);
            req1.setPlaceholderId("{{IMAGE_PLACEHOLDER_1}}");
            req1.setSectionTitle("AI 教育现状");
            req1.setKeywords("AI classroom");
            req1.setPrompt("A futuristic classroom with AI");

            doAnswer(invocation -> {
                Map<String, Object> output = new HashMap<>();
                output.put("contentWithPlaceholders", "这是包含 {{IMAGE_PLACEHOLDER_1}} 的正文。");
                output.put("imageRequirements", List.of(req1));
                return output;
            }).when(contentGeneratorAgent).apply(any());

            // 2) ImageAnalyzerAgent → imageRequirements（补充/确认）
            doAnswer(invocation -> {
                Map<String, Object> output = new HashMap<>();
                output.put("imageRequirements", List.of(req1));
                return output;
            }).when(imageAnalyzerAgent).apply(any());

            // 3) ParallelImageGenerator → images
            ArticleState.ImageResult img1 = new ArticleState.ImageResult();
            img1.setPosition(1);
            img1.setPlaceholderId("{{IMAGE_PLACEHOLDER_1}}");
            img1.setUrl("https://example.com/ai-classroom.png");
            img1.setMethod("svg-diagram");
            img1.setDescription("AI 教室示意图");

            doAnswer(invocation -> {
                Map<String, Object> output = new HashMap<>();
                output.put("images", List.of(img1));
                return output;
            }).when(parallelImageGenerator).apply(any());

            // 4) ContentMergerAgent → fullContent
            doAnswer(invocation -> {
                Map<String, Object> output = new HashMap<>();
                output.put("fullContent", "这是包含 ![AI教室](https://example.com/ai-classroom.png) 的完整正文。");
                return output;
            }).when(contentMergerAgent).apply(any());

            // 执行
            orchestrator.executePhase3_GenerateContent(state, streamHandler);

            // 验证正文
            assertNotNull(state.getContent());
            assertTrue(state.getContent().contains("{{IMAGE_PLACEHOLDER_1}}"));

            // 验证配图需求
            assertNotNull(state.getImageRequirements());
            assertEquals(1, state.getImageRequirements().size());
            assertEquals("AI 教育现状", state.getImageRequirements().get(0).getSectionTitle());

            // 验证配图结果
            assertNotNull(state.getImages());
            assertEquals(1, state.getImages().size());
            assertEquals("https://example.com/ai-classroom.png", state.getImages().get(0).getUrl());

            // 验证完整图文
            assertNotNull(state.getFullContent());
            assertTrue(state.getFullContent().contains("ai-classroom.png"));

            // 验证 SSE 通知：AGENT5_COMPLETE + MERGE_COMPLETE
            assertEquals(2, sseMessages.size());
            assertEquals(SseMessageTypeEnum.AGENT5_COMPLETE.getValue(), sseMessages.get(0));
            assertEquals(SseMessageTypeEnum.MERGE_COMPLETE.getValue(), sseMessages.get(1));
        }

        @Test
        @DisplayName("ContentGeneratorAgent 抛出异常 → 阶段3整体失败")
        void contentGenerator异常_阶段失败() throws Exception {
            setupStateForPhase3();

            doThrow(new RuntimeException("LLM 正文生成超时"))
                    .when(contentGeneratorAgent).apply(any());

            RuntimeException ex = assertThrows(RuntimeException.class,
                    () -> orchestrator.executePhase3_GenerateContent(state, streamHandler));

            assertTrue(ex.getMessage().contains("正文+配图生成失败"));
            assertTrue(ex.getMessage().contains("LLM 正文生成超时"));
            assertTrue(sseMessages.isEmpty(), "失败时不应发送完成通知");
        }

        /**
         * 为 Phase 3 测试预置 Phase 1 & Phase 2 的产出
         */
        private void setupStateForPhase3() {
            ArticleState.TitleResult titleResult = new ArticleState.TitleResult();
            titleResult.setMainTitle("AI 如何重塑教育");
            titleResult.setSubTitle("从个性化学习到智能辅导");
            state.setTitle(titleResult);

            ArticleState.OutlineResult outlineResult = new ArticleState.OutlineResult();
            ArticleState.OutlineSection section = new ArticleState.OutlineSection();
            section.setSection(1);
            section.setTitle("AI 教育现状");
            outlineResult.setSections(List.of(section));
            state.setOutline(outlineResult);
        }
    }

    // ==================== 多阶段顺序执行 ====================

    @Nested
    @DisplayName("多阶段顺序执行（Phase 1 → 2 → 3）")
    class MultiPhaseTest {

        @Test
        @DisplayName("按顺序执行三个阶段 → 每阶段产出正确传递到下一阶段")
        void 按顺序执行三阶段_产出正确传递() throws Exception {
            // === Phase 1 mock ===
            ArticleState.TitleOption option = new ArticleState.TitleOption();
            option.setMainTitle("AI 教育革命");
            option.setSubTitle("技术与未来的交汇");

            doAnswer(invocation -> Map.of("titleOptions", List.of(option)))
                    .when(titleGeneratorAgent).apply(any());

            orchestrator.executePhase1_GenerateTitles(state, streamHandler);

            // 验证 Phase 1 产出
            assertNotNull(state.getTitleOptions());
            assertEquals(1, state.getTitleOptions().size());

            // === Phase 2 mock ===
            // 用户选择标题 → 设置 title
            ArticleState.TitleResult selected = new ArticleState.TitleResult();
            selected.setMainTitle(state.getTitleOptions().get(0).getMainTitle());
            selected.setSubTitle(state.getTitleOptions().get(0).getSubTitle());
            state.setTitle(selected);

            ArticleState.OutlineResult outline = new ArticleState.OutlineResult();
            ArticleState.OutlineSection sec = new ArticleState.OutlineSection();
            sec.setSection(1);
            sec.setTitle("引言");
            outline.setSections(List.of(sec));

            doAnswer(invocation -> Map.of("outline", outline))
                    .when(outlineGeneratorAgent).apply(any());

            orchestrator.executePhase2_GenerateOutline(state, streamHandler);

            // 验证 Phase 2 产出
            assertNotNull(state.getOutline());
            assertEquals("引言", state.getOutline().getSections().get(0).getTitle());

            // === Phase 3 mock ===
            ArticleState.ImageRequirement req = new ArticleState.ImageRequirement();
            req.setPosition(1);
            req.setPlaceholderId("{{IMAGE_PLACEHOLDER_1}}");
            req.setPrompt("AI in classroom");

            doAnswer(invocation -> {
                Map<String, Object> out = new HashMap<>();
                out.put("contentWithPlaceholders", "正文内容 {{IMAGE_PLACEHOLDER_1}}");
                out.put("imageRequirements", List.of(req));
                return out;
            }).when(contentGeneratorAgent).apply(any());

            doAnswer(invocation -> Map.of("imageRequirements", List.of(req)))
                    .when(imageAnalyzerAgent).apply(any());

            ArticleState.ImageResult img = new ArticleState.ImageResult();
            img.setPosition(1);
            img.setPlaceholderId("{{IMAGE_PLACEHOLDER_1}}");
            img.setUrl("https://example.com/img.png");

            doAnswer(invocation -> Map.of("images", List.of(img)))
                    .when(parallelImageGenerator).apply(any());

            doAnswer(invocation -> Map.of("fullContent", "完整图文内容"))
                    .when(contentMergerAgent).apply(any());

            orchestrator.executePhase3_GenerateContent(state, streamHandler);

            // 验证 Phase 3 产出
            assertNotNull(state.getContent());
            assertNotNull(state.getImages());
            assertNotNull(state.getFullContent());

            // 验证 SSE 消息总数：Phase1(1) + Phase2(1) + Phase3(2) = 4
            assertEquals(4, sseMessages.size(), "三阶段应产生 4 条 SSE 通知");
            assertEquals(SseMessageTypeEnum.AGENT1_COMPLETE.getValue(), sseMessages.get(0));
            assertEquals(SseMessageTypeEnum.AGENT2_COMPLETE.getValue(), sseMessages.get(1));
            assertEquals(SseMessageTypeEnum.AGENT5_COMPLETE.getValue(), sseMessages.get(2));
            assertEquals(SseMessageTypeEnum.MERGE_COMPLETE.getValue(), sseMessages.get(3));
        }

        @Test
        @DisplayName("Phase 2 失败 → Phase 3 不执行，异常正确传递")
        void phase2失败_phase3不执行() throws Exception {
            // Phase 1 成功
            ArticleState.TitleOption option = new ArticleState.TitleOption();
            option.setMainTitle("Test");
            option.setSubTitle("Test");
            doAnswer(invocation -> Map.of("titleOptions", List.of(option)))
                    .when(titleGeneratorAgent).apply(any());

            orchestrator.executePhase1_GenerateTitles(state, streamHandler);

            // 设置标题供 Phase 2 使用
            ArticleState.TitleResult titleResult = new ArticleState.TitleResult();
            titleResult.setMainTitle("Test");
            titleResult.setSubTitle("Test");
            state.setTitle(titleResult);

            // Phase 2 失败
            doThrow(new RuntimeException("大纲生成 LLM 异常"))
                    .when(outlineGeneratorAgent).apply(any());

            assertThrows(RuntimeException.class,
                    () -> orchestrator.executePhase2_GenerateOutline(state, streamHandler));

            // Phase 3 不应被调用
            verifyNoInteractions(contentGeneratorAgent);
            verifyNoInteractions(imageAnalyzerAgent);
            verifyNoInteractions(parallelImageGenerator);
            verifyNoInteractions(contentMergerAgent);
        }
    }
}

package com.ywt.passage.agent.parallel;

import com.alibaba.cloud.ai.graph.OverAllState;
import com.ywt.passage.agent.StreamHandlerContext;
import com.ywt.passage.agent.tools.ImageGenerationTool;
import com.ywt.passage.config.SvgDiagramConfig;
import com.ywt.passage.model.dto.article.ArticleState;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.*;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.function.Consumer;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * ParallelImageGenerator 单元测试
 * Mock ImageGenerationTool 和 OverAllState，验证并行分组、容错降级逻辑。
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("ParallelImageGenerator — 并行图片生成器")
class ParallelImageGeneratorTest {

    @Mock
    private ImageGenerationTool imageGenerationTool;

    @Mock
    private SvgDiagramConfig svgDiagramConfig;

    @Mock
    private OverAllState overAllState;

    @InjectMocks
    private ParallelImageGenerator parallelImageGenerator;

    private List<String> sseMessages;
    private Consumer<String> streamHandler;

    @BeforeEach
    void setUp() {
        sseMessages = new ArrayList<>();
        streamHandler = sseMessages::add;
        StreamHandlerContext.set(streamHandler);

        // 默认配置：缓存关闭（避免影响并发逻辑测试）
        lenient().when(svgDiagramConfig.getMaxConcurrency()).thenReturn(2);
    }

    @AfterEach
    void tearDown() {
        StreamHandlerContext.clear();
    }

    // ==================== 并行分组执行 ====================

    @Nested
    @DisplayName("多来源并行生成")
    class MultiSourceTest {

        @Test
        @DisplayName("不同 imageSource 按组并行 → 所有需求都被处理")
        void 多来源_按source分组并行() {
            // 构造 3 个需求：2 个 PEXELS + 1 个 SVG_DIAGRAM
            ArticleState.ImageRequirement req1 = buildRequirement("PEXELS", 1, "cat", null);
            ArticleState.ImageRequirement req2 = buildRequirement("PEXELS", 2, "dog", null);
            ArticleState.ImageRequirement req3 = buildRequirement("SVG_DIAGRAM", 3, null, "AI architecture");

            mockStateWithRequirements(List.of(req1, req2, req3));

            // Mock generateImageDirect 返回成功结果
            when(imageGenerationTool.generateImageDirect(
                    anyString(), any(), any(), anyInt(), any(), any(), any()))
                    .thenAnswer(invocation -> {
                        String source = invocation.getArgument(0);
                        int pos = invocation.getArgument(3);
                        return buildSuccessResult(pos, "https://example.com/" + source + "-" + pos + ".png", source);
                    });

            // 执行
            Map<String, Object> output = parallelImageGenerator.apply(overAllState);

            // 验证输出
            @SuppressWarnings("unchecked")
            List<ArticleState.ImageResult> images = (List<ArticleState.ImageResult>) output.get("images");
            assertNotNull(images);
            assertEquals(3, images.size(), "3 个需求应生成 3 张图片");

            // 验证按 position 排序
            assertEquals(1, images.get(0).getPosition());
            assertEquals(2, images.get(1).getPosition());
            assertEquals(3, images.get(2).getPosition());

            // 验证 generateImageDirect 被调用了 3 次
            verify(imageGenerationTool, times(3)).generateImageDirect(
                    anyString(), any(), any(), anyInt(), any(), any(), any());
        }

        @Test
        @DisplayName("空需求列表 → 返回空图片列表，不调用生成器")
        void 空需求_返回空列表() {
            mockStateWithRequirements(List.of());

            Map<String, Object> output = parallelImageGenerator.apply(overAllState);

            @SuppressWarnings("unchecked")
            List<ArticleState.ImageResult> images = (List<ArticleState.ImageResult>) output.get("images");
            assertNotNull(images);
            assertTrue(images.isEmpty());
            verifyNoInteractions(imageGenerationTool);
        }

        @Test
        @DisplayName("无需求（state 中无 imageRequirements）→ 返回空列表")
        void 无需求_返回空列表() {
            when(overAllState.value("imageRequirements")).thenReturn(Optional.empty());

            Map<String, Object> output = parallelImageGenerator.apply(overAllState);

            @SuppressWarnings("unchecked")
            List<ArticleState.ImageResult> images = (List<ArticleState.ImageResult>) output.get("images");
            assertNotNull(images);
            assertTrue(images.isEmpty());
        }

        @Test
        @DisplayName("单个来源多张图片 → 同一来源内串行执行")
        void 单来源多张_串行执行() {
            ArticleState.ImageRequirement req1 = buildRequirement("PEXELS", 1, "cat", null);
            ArticleState.ImageRequirement req2 = buildRequirement("PEXELS", 2, "dog", null);
            ArticleState.ImageRequirement req3 = buildRequirement("PEXELS", 3, "bird", null);

            mockStateWithRequirements(List.of(req1, req2, req3));

            when(imageGenerationTool.generateImageDirect(
                    anyString(), any(), any(), anyInt(), any(), any(), any()))
                    .thenAnswer(invocation -> {
                        int pos = invocation.getArgument(3);
                        return buildSuccessResult(pos, "https://example.com/img-" + pos + ".png", "PEXELS");
                    });

            Map<String, Object> output = parallelImageGenerator.apply(overAllState);

            @SuppressWarnings("unchecked")
            List<ArticleState.ImageResult> images = (List<ArticleState.ImageResult>) output.get("images");
            assertEquals(3, images.size());

            // 验证所有 3 张都用 PEXELS 来源生成
            verify(imageGenerationTool, times(3)).generateImageDirect(
                    eq("PEXELS"), any(), any(), anyInt(), any(), any(), any());
        }

        @Test
        @DisplayName("结果按 position 升序排列")
        void 结果按position排序() {
            // 构造乱序的 position
            ArticleState.ImageRequirement req1 = buildRequirement("PEXELS", 3, "cat", null);
            ArticleState.ImageRequirement req2 = buildRequirement("SVG_DIAGRAM", 1, null, "diagram");
            ArticleState.ImageRequirement req3 = buildRequirement("ICONIFY", 2, "icon", null);

            mockStateWithRequirements(List.of(req1, req2, req3));

            when(imageGenerationTool.generateImageDirect(
                    anyString(), any(), any(), anyInt(), any(), any(), any()))
                    .thenAnswer(invocation -> {
                        int pos = invocation.getArgument(3);
                        return buildSuccessResult(pos, "https://example.com/img-" + pos + ".png", "unknown");
                    });

            Map<String, Object> output = parallelImageGenerator.apply(overAllState);

            @SuppressWarnings("unchecked")
            List<ArticleState.ImageResult> images = (List<ArticleState.ImageResult>) output.get("images");
            assertEquals(3, images.size());
            assertEquals(1, images.get(0).getPosition());
            assertEquals(2, images.get(1).getPosition());
            assertEquals(3, images.get(2).getPosition());
        }
    }

    // ==================== 容错降级 ====================

    @Nested
    @DisplayName("容错降级")
    class FaultToleranceTest {

        @Test
        @DisplayName("某来源抛出异常 → 不影响其他来源正常生成")
        void 某来源异常_不影响其他来源() {
            ArticleState.ImageRequirement reqPexels = buildRequirement("PEXELS", 1, "cat", null);
            ArticleState.ImageRequirement reqSvg = buildRequirement("SVG_DIAGRAM", 2, null, "AI flow");
            ArticleState.ImageRequirement reqIcon = buildRequirement("ICONIFY", 3, "icon", null);

            mockStateWithRequirements(List.of(reqPexels, reqSvg, reqIcon));

            // PEXELS 抛异常，其他正常
            when(imageGenerationTool.generateImageDirect(
                    eq("PEXELS"), any(), any(), anyInt(), any(), any(), any()))
                    .thenThrow(new RuntimeException("Pexels API 超时"));

            when(imageGenerationTool.generateImageDirect(
                    eq("SVG_DIAGRAM"), any(), any(), anyInt(), any(), any(), any()))
                    .thenAnswer(invocation ->
                            buildSuccessResult(2, "https://example.com/svg.svg", "SVG_DIAGRAM"));

            when(imageGenerationTool.generateImageDirect(
                    eq("ICONIFY"), any(), any(), anyInt(), any(), any(), any()))
                    .thenAnswer(invocation ->
                            buildSuccessResult(3, "https://example.com/icon.png", "ICONIFY"));

            // 执行 — 不应抛出异常
            Map<String, Object> output = parallelImageGenerator.apply(overAllState);

            @SuppressWarnings("unchecked")
            List<ArticleState.ImageResult> images = (List<ArticleState.ImageResult>) output.get("images");
            assertNotNull(images);
            assertEquals(2, images.size(), "PEXELS 失败，但 SVG_DIAGRAM 和 ICONIFY 应成功");

            // 验证成功的来源
            Set<String> urls = new HashSet<>();
            images.forEach(img -> urls.add(img.getUrl()));
            assertTrue(urls.contains("https://example.com/svg.svg"));
            assertTrue(urls.contains("https://example.com/icon.png"));
        }

        @Test
        @DisplayName("generateImageDirect 返回 failure 结果 → 跳过该需求，不影响其他")
        void 返回failure结果_跳过该需求() {
            ArticleState.ImageRequirement req1 = buildRequirement("PEXELS", 1, "cat", null);
            ArticleState.ImageRequirement req2 = buildRequirement("SVG_DIAGRAM", 2, null, "diagram");

            mockStateWithRequirements(List.of(req1, req2));

            // PEXELS 返回失败结果（不是异常）
            ImageGenerationTool.ImageGenerationResult failResult = new ImageGenerationTool.ImageGenerationResult();
            failResult.setSuccess(false);
            failResult.setError("No images found");
            failResult.setPosition(1);

            when(imageGenerationTool.generateImageDirect(
                    eq("PEXELS"), any(), any(), anyInt(), any(), any(), any()))
                    .thenReturn(failResult);

            when(imageGenerationTool.generateImageDirect(
                    eq("SVG_DIAGRAM"), any(), any(), anyInt(), any(), any(), any()))
                    .thenAnswer(invocation ->
                            buildSuccessResult(2, "https://example.com/svg.svg", "SVG_DIAGRAM"));

            Map<String, Object> output = parallelImageGenerator.apply(overAllState);

            @SuppressWarnings("unchecked")
            List<ArticleState.ImageResult> images = (List<ArticleState.ImageResult>) output.get("images");
            assertNotNull(images);
            assertEquals(1, images.size(), "PEXELS 失败，仅 SVG_DIAGRAM 成功");
            assertEquals("https://example.com/svg.svg", images.get(0).getUrl());
        }

        @Test
        @DisplayName("所有来源均失败 → 返回空图片列表")
        void 所有来源均失败_返回空列表() {
            ArticleState.ImageRequirement req1 = buildRequirement("PEXELS", 1, "cat", null);
            ArticleState.ImageRequirement req2 = buildRequirement("SVG_DIAGRAM", 2, null, "diagram");

            mockStateWithRequirements(List.of(req1, req2));

            when(imageGenerationTool.generateImageDirect(
                    anyString(), any(), any(), anyInt(), any(), any(), any()))
                    .thenThrow(new RuntimeException("所有 API 不可用"));

            Map<String, Object> output = parallelImageGenerator.apply(overAllState);

            @SuppressWarnings("unchecked")
            List<ArticleState.ImageResult> images = (List<ArticleState.ImageResult>) output.get("images");
            assertNotNull(images);
            assertTrue(images.isEmpty(), "全部失败时应返回空列表");
        }

        @Test
        @DisplayName("混合：异常 + 失败结果 + 成功 → 仅成功的结果被收集")
        void 混合结果_仅成功被收集() {
            ArticleState.ImageRequirement req1 = buildRequirement("PEXELS", 1, "cat", null);
            ArticleState.ImageRequirement req2 = buildRequirement("SVG_DIAGRAM", 2, null, "diagram");
            ArticleState.ImageRequirement req3 = buildRequirement("ICONIFY", 3, "icon", null);

            mockStateWithRequirements(List.of(req1, req2, req3));

            // req1: 抛异常
            when(imageGenerationTool.generateImageDirect(
                    eq("PEXELS"), any(), any(), anyInt(), any(), any(), any()))
                    .thenThrow(new RuntimeException("timeout"));

            // req2: 返回失败结果
            ImageGenerationTool.ImageGenerationResult failResult = new ImageGenerationTool.ImageGenerationResult();
            failResult.setSuccess(false);
            failResult.setError("generation failed");
            when(imageGenerationTool.generateImageDirect(
                    eq("SVG_DIAGRAM"), any(), any(), anyInt(), any(), any(), any()))
                    .thenReturn(failResult);

            // req3: 成功
            when(imageGenerationTool.generateImageDirect(
                    eq("ICONIFY"), any(), any(), anyInt(), any(), any(), any()))
                    .thenAnswer(invocation ->
                            buildSuccessResult(3, "https://example.com/icon.png", "ICONIFY"));

            Map<String, Object> output = parallelImageGenerator.apply(overAllState);

            @SuppressWarnings("unchecked")
            List<ArticleState.ImageResult> images = (List<ArticleState.ImageResult>) output.get("images");
            assertEquals(1, images.size(), "仅 ICONIFY 成功");
            assertEquals("https://example.com/icon.png", images.get(0).getUrl());
        }
    }

    // ==================== 辅助方法 ====================

    private ArticleState.ImageRequirement buildRequirement(String imageSource, int position,
                                                            String keywords, String prompt) {
        ArticleState.ImageRequirement req = new ArticleState.ImageRequirement();
        req.setImageSource(imageSource);
        req.setPosition(position);
        req.setKeywords(keywords);
        req.setPrompt(prompt);
        req.setType("illustration");
        req.setSectionTitle("Section " + position);
        req.setPlaceholderId("{{IMAGE_PLACEHOLDER_" + position + "}}");
        return req;
    }

    private ImageGenerationTool.ImageGenerationResult buildSuccessResult(int position, String url, String method) {
        ImageGenerationTool.ImageGenerationResult result = new ImageGenerationTool.ImageGenerationResult();
        result.setSuccess(true);
        result.setPosition(position);
        result.setUrl(url);
        result.setMethod(method);
        result.setKeywords("test-keywords");
        result.setSectionTitle("Section " + position);
        result.setDescription("Generated image for position " + position);
        result.setPlaceholderId("{{IMAGE_PLACEHOLDER_" + position + "}}");
        return result;
    }

    private void mockStateWithRequirements(List<ArticleState.ImageRequirement> requirements) {
        when(overAllState.value("imageRequirements")).thenReturn(Optional.of(requirements));
    }
}

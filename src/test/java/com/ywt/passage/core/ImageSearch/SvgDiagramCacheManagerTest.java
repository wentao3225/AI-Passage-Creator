package com.ywt.passage.core.ImageSearch;

import com.ywt.passage.config.SvgDiagramConfig;
import com.ywt.passage.model.dto.image.ImageData;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.FileTime;
import java.time.Instant;
import java.time.temporal.ChronoUnit;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.lenient;

/**
 * SvgDiagramCacheManager 单元测试
 * 使用 Mockito mock 配置，@TempDir 管理临时文件，不依赖 Spring 容器。
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("SvgDiagramCacheManager — SVG 本地缓存管理器")
class SvgDiagramCacheManagerTest {

    private static final String VALID_SVG =
            "<svg xmlns=\"http://www.w3.org/2000/svg\"><rect width=\"100\" height=\"100\"/></svg>";
    private static final String REQUIREMENT = "画一个流程图";
    @TempDir
    Path tempDir;
    @Mock
    private SvgDiagramConfig svgDiagramConfig;
    @InjectMocks
    private SvgDiagramCacheManager cacheManager;

    @BeforeEach
    void setUp() {
        // 默认配置：缓存开启，TTL 1440 分钟（24 小时），使用临时目录
        lenient().when(svgDiagramConfig.getCacheEnabled()).thenReturn(true);
        lenient().when(svgDiagramConfig.getCacheTtlMinutes()).thenReturn(1440L);
        lenient().when(svgDiagramConfig.getCacheDir()).thenReturn(tempDir.toString());
    }

    // ==================== tryReadCache ====================

    /**
     * 在临时目录中查找已写入的 .svg 缓存文件
     */
    private Path findCacheFile() {
        try (var stream = Files.list(tempDir)) {
            return stream
                    .filter(p -> p.toString().endsWith(".svg"))
                    .findFirst()
                    .orElse(null);
        } catch (Exception e) {
            fail("列出缓存目录失败", e);
            return null;
        }
    }

    // ==================== writeCache ====================

    /**
     * 根据 requirement 构造预期的缓存文件路径（复用管理器的 key 逻辑）
     */
    private Path findExpectedCacheFile(String requirement) {
        String normalized = cacheManager.normalizeRequirement(requirement);
        String md5 = cn.hutool.crypto.SecureUtil.md5(normalized);
        return tempDir.resolve(md5 + ".svg");
    }

    // ==================== normalizeRequirement ====================

    @Nested
    @DisplayName("tryReadCache")
    class TryReadCacheTest {

        @Test
        @DisplayName("缓存未命中 — 返回 null")
        void 缓存未命中_返回null() {
            ImageData result = cacheManager.tryReadCache(REQUIREMENT);
            assertNull(result, "缓存文件不存在时应返回 null");
        }

        @Test
        @DisplayName("缓存命中 — 返回相同 SVG 数据")
        void 缓存命中_返回相同SVG() {
            // 先写入缓存
            cacheManager.writeCache(REQUIREMENT, VALID_SVG);

            // 再读取
            ImageData result = cacheManager.tryReadCache(REQUIREMENT);

            assertNotNull(result, "缓存命中时应返回 ImageData");
            assertArrayEquals(VALID_SVG.getBytes(StandardCharsets.UTF_8), result.getBytes());
            assertEquals("image/svg+xml", result.getMimeType());
        }

        @Test
        @DisplayName("缓存过期 — 返回 null 并删除过期文件")
        void 缓存过期_返回null() {
            // 先写入缓存
            cacheManager.writeCache(REQUIREMENT, VALID_SVG);

            // 将缓存文件的修改时间设置为 25 小时前（超过 TTL 1440 分钟 = 24 小时）
            Path cacheFile = findCacheFile();
            assertNotNull(cacheFile, "写入后应能找到缓存文件");
            try {
                Files.setLastModifiedTime(cacheFile,
                        FileTime.from(Instant.now().minus(25, ChronoUnit.HOURS)));
            } catch (Exception e) {
                fail("设置文件修改时间失败", e);
            }

            // 读取 → 应视为过期
            ImageData result = cacheManager.tryReadCache(REQUIREMENT);
            assertNull(result, "缓存过期时应返回 null");

            // 过期后文件应被删除
            assertFalse(Files.exists(cacheFile), "过期缓存文件应被清理");
        }

        @Test
        @DisplayName("缓存内容无效（非 SVG）— 返回 null 并删除坏文件")
        void 缓存内容无效_返回null() {
            // 手动写入一个非 SVG 文件到缓存路径
            Path cacheFile = findExpectedCacheFile(REQUIREMENT);
            try {
                Files.writeString(cacheFile, "not a svg content", StandardCharsets.UTF_8);
            } catch (Exception e) {
                fail("写入测试文件失败", e);
            }

            ImageData result = cacheManager.tryReadCache(REQUIREMENT);
            assertNull(result, "缓存内容无效时应返回 null");
            assertFalse(Files.exists(cacheFile), "坏缓存文件应被清理");
        }

        @Test
        @DisplayName("空白 normalizedRequirement — 返回 null")
        void 空白normalizedRequirement_返回null() {
            assertNull(cacheManager.tryReadCache(null));
            assertNull(cacheManager.tryReadCache(""));
            assertNull(cacheManager.tryReadCache("   "));
        }

        @Test
        @DisplayName("缓存关闭 — 返回 null")
        void 缓存关闭_返回null() {
            lenient().when(svgDiagramConfig.getCacheEnabled()).thenReturn(false);

            cacheManager.writeCache(REQUIREMENT, VALID_SVG); // 写入也应被忽略
            ImageData result = cacheManager.tryReadCache(REQUIREMENT);

            assertNull(result, "缓存关闭时应返回 null");
        }
    }

    // ==================== 缓存一致性（写入-读取往返）====================

    @Nested
    @DisplayName("writeCache")
    class WriteCacheTest {

        @Test
        @DisplayName("正常写入 — 缓存文件存在于磁盘")
        void 正常写入_文件存在() {
            cacheManager.writeCache(REQUIREMENT, VALID_SVG);

            Path cacheFile = findCacheFile();
            assertNotNull(cacheFile, "写入后缓存文件应存在");
            assertTrue(Files.exists(cacheFile));

            try {
                String content = Files.readString(cacheFile, StandardCharsets.UTF_8);
                assertEquals(VALID_SVG, content);
            } catch (Exception e) {
                fail("读取缓存文件失败", e);
            }
        }

        @Test
        @DisplayName("写入无效 SVG — 不创建文件")
        void 写入无效SVG_不创建文件() {
            cacheManager.writeCache(REQUIREMENT, "not valid svg");

            Path cacheFile = findExpectedCacheFile(REQUIREMENT);
            assertFalse(Files.exists(cacheFile), "无效 SVG 不应写入缓存");
        }

        @Test
        @DisplayName("写入空白内容 — 不创建文件")
        void 写入空白内容_不创建文件() {
            cacheManager.writeCache(REQUIREMENT, "");
            cacheManager.writeCache(REQUIREMENT, null);

            Path cacheFile = findExpectedCacheFile(REQUIREMENT);
            assertFalse(Files.exists(cacheFile));
        }

        @Test
        @DisplayName("缓存关闭 — 不创建文件")
        void 缓存关闭_不创建文件() {
            lenient().when(svgDiagramConfig.getCacheEnabled()).thenReturn(false);

            cacheManager.writeCache(REQUIREMENT, VALID_SVG);

            // 缓存目录本身都不应被创建
            try (var stream = Files.list(tempDir)) {
                assertTrue(stream.findAny().isEmpty(),
                        "缓存关闭时不应有任何文件");
            } catch (Exception e) {
                fail("列出缓存目录失败", e);
            }
        }

        @Test
        @DisplayName("覆盖写入 — 文件内容更新")
        void 覆盖写入_内容更新() {
            String svgV1 = "<svg xmlns=\"http://www.w3.org/2000/svg\"><circle r=\"10\"/></svg>";
            String svgV2 = "<svg xmlns=\"http://www.w3.org/2000/svg\"><circle r=\"20\"/></svg>";

            cacheManager.writeCache(REQUIREMENT, svgV1);
            cacheManager.writeCache(REQUIREMENT, svgV2);

            Path cacheFile = findCacheFile();
            assertNotNull(cacheFile);
            try {
                String content = Files.readString(cacheFile, StandardCharsets.UTF_8);
                assertEquals(svgV2, content, "第二次写入应覆盖第一次的内容");
            } catch (Exception e) {
                fail("读取缓存文件失败", e);
            }
        }
    }

    // ==================== 辅助方法 ====================

    @Nested
    @DisplayName("normalizeRequirement")
    class NormalizeRequirementTest {

        @Test
        @DisplayName("null / 空白 → 返回空字符串")
        void null空白_返回空字符串() {
            assertEquals("", cacheManager.normalizeRequirement(null));
            assertEquals("", cacheManager.normalizeRequirement(""));
            assertEquals("", cacheManager.normalizeRequirement("   "));
        }

        @Test
        @DisplayName("首尾空白 → trim")
        void 首尾空白_trim() {
            assertEquals("hello", cacheManager.normalizeRequirement("  hello  "));
        }

        @Test
        @DisplayName("多个空白字符 → 合并为单个空格")
        void 多个空白合并() {
            assertEquals("画 一个 流程图", cacheManager.normalizeRequirement("画   一个\n\t流程图"));
        }

        @Test
        @DisplayName("相同内容规范化后一致 → 缓存 key 一致")
        void 相同内容规范化一致() {
            String a = cacheManager.normalizeRequirement("  hello  world  ");
            String b = cacheManager.normalizeRequirement("hello world");
            assertEquals(a, b, "规范化后相同内容应产生相同的缓存 key");
        }
    }

    @Nested
    @DisplayName("缓存一致性（write → read 往返）")
    class CacheRoundTripTest {

        @Test
        @DisplayName("写入后立即读取 — 数据完整一致")
        void 写入后立即读取_数据一致() {
            String svg = "<svg xmlns=\"http://www.w3.org/2000/svg\"><text x=\"10\" y=\"20\">Hi</text></svg>";

            cacheManager.writeCache(REQUIREMENT, svg);
            ImageData result = cacheManager.tryReadCache(REQUIREMENT);

            assertNotNull(result);
            assertEquals(svg, new String(result.getBytes(), StandardCharsets.UTF_8));
        }

        @Test
        @DisplayName("不同 requirement → 不同缓存文件")
        void 不同requirement_不同缓存文件() {
            cacheManager.writeCache("需求A", VALID_SVG);
            cacheManager.writeCache("需求B", VALID_SVG);

            // 两次写入后应有两个不同的缓存文件
            try (var stream = Files.list(tempDir)) {
                long count = stream
                        .filter(p -> p.toString().endsWith(".svg"))
                        .count();
                assertEquals(2, count, "两个不同需求应产生两个缓存文件");
            } catch (Exception e) {
                fail("列出缓存目录失败", e);
            }
        }

        @Test
        @DisplayName("相同 requirement → 复用同一缓存文件")
        void 相同requirement_复用同一文件() {
            cacheManager.writeCache(REQUIREMENT, VALID_SVG);
            cacheManager.writeCache(REQUIREMENT, VALID_SVG);

            try (var stream = Files.list(tempDir)) {
                long count = stream
                        .filter(p -> p.toString().endsWith(".svg"))
                        .count();
                assertEquals(1, count, "相同需求应复用同一个缓存文件");
            } catch (Exception e) {
                fail("列出缓存目录失败", e);
            }
        }
    }
}

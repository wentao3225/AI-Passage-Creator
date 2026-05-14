package com.ywt.passage.core.ImageSearch;


import cn.hutool.core.util.StrUtil;
import cn.hutool.crypto.SecureUtil;
import com.ywt.passage.config.SvgDiagramConfig;
import com.ywt.passage.model.dto.image.ImageData;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.nio.file.attribute.FileTime;
import java.time.Duration;
import java.time.Instant;

/**
 * SVG 本地缓存管理器
 * 负责 requirement 规范化、缓存 key 计算、缓存文件读写、TTL 判断和坏缓存清理
 */
@Component
@Slf4j
public class SvgDiagramCacheManager {

    private static final String SVG_CONTENT_TYPE = "image/svg+xml";
    private static final String CACHE_FILE_SUFFIX = ".svg";
    private static final String TEMP_FILE_SUFFIX = ".tmp";

    @Resource
    private SvgDiagramConfig svgDiagramConfig;

    public ImageData tryReadCache(String normalizedRequirement) {
        if (Boolean.FALSE.equals(svgDiagramConfig.getCacheEnabled())) {
            return null;
        }
        if (StrUtil.isBlank(normalizedRequirement)) {
            return null;
        }
        // 缓存key
        String cacheKey = buildCacheKey(normalizedRequirement);
        // 缓存文件
        Path cacheFile = resolveCacheFile(normalizedRequirement);

        try {
            if (!Files.exists(cacheFile)) {
                log.info("SVG 缓存未命中, key={}", cacheKey);
                return null;
            }

            if (isCacheExpired(cacheFile)) {
                log.info("SVG 缓存已过期, key={}, file={}", cacheKey, cacheFile);
                deleteQuietly(cacheFile);
                return null;
            }

            String svgCode = Files.readString(cacheFile, StandardCharsets.UTF_8);
            if (!isSvgContentValid(svgCode)) {
                log.warn("SVG 缓存内容无效, key={}, file={}", cacheKey, cacheFile);
                deleteQuietly(cacheFile);
                return null;
            }

            byte[] svgCodeBytes = svgCode.getBytes(StandardCharsets.UTF_8);
            log.info("SVG 缓存命中, key={}, file={}, size={} bytes",
                    cacheKey, cacheFile, svgCodeBytes.length);
            return ImageData.fromBytes(svgCodeBytes,SVG_CONTENT_TYPE);
        } catch (Exception e) {
            log.warn("SVG 缓存读取失败, key={}", cacheKey, e);
            return null;
        }
    }

    /**
     * 写入 SVG 本地缓存
     */
    public void writeCache(String normalizedRequirement, String svgCode) {
        if (Boolean.FALSE.equals(svgDiagramConfig.getCacheEnabled())) {
            return;
        }
        if (StrUtil.isBlank(normalizedRequirement) || StrUtil.isBlank(svgCode)) {
            return;
        }
        if (!isSvgContentValid(svgCode)) {
            log.warn("跳过写入svg缓存，内容校验未通过");
            return;
        }
        // 缓存key
        String cacheKey = buildCacheKey(normalizedRequirement);
        Path targetFile = resolveCacheFile(normalizedRequirement);
        Path cacheRoot = targetFile.getParent();
        Path tempFile = cacheRoot.resolve(cacheKey + TEMP_FILE_SUFFIX);

        try {
            Files.createDirectories(cacheRoot);
            Files.writeString(tempFile, svgCode, StandardCharsets.UTF_8,
                    StandardOpenOption.CREATE,
                    StandardOpenOption.TRUNCATE_EXISTING,
                    StandardOpenOption.WRITE);
            try {
                Files.move(tempFile, targetFile,
                        StandardCopyOption.REPLACE_EXISTING,
                        StandardCopyOption.ATOMIC_MOVE);
            } catch (AtomicMoveNotSupportedException e) {
                log.warn("SVG移动出错：{}", e.getMessage());
                Files.move(tempFile, targetFile, StandardCopyOption.REPLACE_EXISTING);
            }
            log.info("SVG 缓存写入成功, key={}, file={}", cacheKey, targetFile);
        } catch (Exception e) {
            log.warn("SVG 缓存写入失败, key={}", cacheKey, e);
            deleteQuietly(tempFile);
        }
    }

    /**
     * 规范化 requirement
     */
    public String normalizeRequirement(String requirement) {
        if (StrUtil.isBlank(requirement)) {
            return "";
        }
        return requirement.trim().replaceAll("\\s+", " ");
    }

    private String buildCacheKey(String normalizedRequirement) {
        // 这里返回 32 位 md5 或 64 位 sha256 都可以
        return SecureUtil.md5(normalizedRequirement);
    }

    /**
     * 解析某个 requirement 对应的缓存文件路径
     */
    private Path resolveCacheFile(String normalizedRequirement) {
        String cacheKey = buildCacheKey(normalizedRequirement);
        return resolveCacheRoot().resolve(cacheKey + CACHE_FILE_SUFFIX);
    }

    /**
     * 解析缓存根目录
     */
    private Path resolveCacheRoot() {
        String cacheDir = svgDiagramConfig.getCacheDir();
        if (StrUtil.isBlank(cacheDir)) {
            cacheDir = "tmp/svg-diagram-cache";
        }
        return Paths.get(cacheDir).toAbsolutePath().normalize();
    }

    /**
     * 判断缓存是否过期
     */
    private boolean isCacheExpired(Path cacheFile) throws IOException {
        Long cacheTtlMinutes = svgDiagramConfig.getCacheTtlMinutes();
        if (cacheTtlMinutes == null || cacheTtlMinutes <= 0) {
            return false;
        }

        FileTime lastModifiedTime = Files.getLastModifiedTime(cacheFile);
        Instant expireAt = lastModifiedTime.toInstant().plus(Duration.ofMinutes(cacheTtlMinutes));
        return Instant.now().isAfter(expireAt);
    }

    /**
     * 安静删除缓存文件，失败时只记日志
     */
    private void deleteQuietly(Path file) {
        if (file == null) {
            return;
        }

        try {
            Files.deleteIfExists(file);
        } catch (Exception e) {
            log.warn("删除 SVG 缓存文件失败, file={}", file, e);
        }
    }

    /**
     * 校验缓存中的 SVG 内容是否满足最基本格式要求
     */
    private boolean isSvgContentValid(String svgCode) {
        return StrUtil.isNotBlank(svgCode)
                && svgCode.contains("<svg")
                && svgCode.contains("</svg>");
    }
}

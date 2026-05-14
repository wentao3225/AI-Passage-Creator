package com.ywt.passage.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

import static com.ywt.passage.constant.ArticleConstant.SVG_DEFAULT_HEIGHT;
import static com.ywt.passage.constant.ArticleConstant.SVG_DEFAULT_WIDTH;

/**
 * SVG 概念示意图生成配置
 */
@Configuration
@ConfigurationProperties(prefix = "svg-diagram")
@Data
public class SvgDiagramConfig {

    /**
     * 默认宽度
     */
    private Integer defaultWidth = SVG_DEFAULT_WIDTH;

    /**
     * 默认高度
     */
    private Integer defaultHeight = SVG_DEFAULT_HEIGHT;

    /**
     * COS 存储文件夹
     */
    private String folder = "svg-diagrams";

    /**
     * SVG 同源并发上限
     */
    private Integer maxConcurrency = 2;

    /**
     * 是否启用 SVG 缓存
     */
    private Boolean cacheEnabled = true;

    /**
     * SVG 缓存 TTL（分钟）
     */
    private Long cacheTtlMinutes = 1440L;

    /**
     * SVG 缓存目录
     */
    private String cacheDir = "tmp/svg-diagram-cache";
}

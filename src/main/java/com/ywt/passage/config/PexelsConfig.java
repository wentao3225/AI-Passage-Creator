package com.ywt.passage.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * Pexels 配置
 */
@Data
@Configuration
@ConfigurationProperties(prefix = "pexels")
public class PexelsConfig {

    /**
     * API Key
     */
    private String apiKey;
}

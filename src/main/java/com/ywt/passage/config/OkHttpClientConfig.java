package com.ywt.passage.config;

import okhttp3.OkHttpClient;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * 对外 HTTP 客户端配置
 */
@Configuration
public class OkHttpClientConfig {

    @Bean("imageSearchOkHttpClient")
    public OkHttpClient imageSearchOkHttpClient() {
        OkHttpClient.Builder builder = new OkHttpClient.Builder();
        return builder.build();
    }
}
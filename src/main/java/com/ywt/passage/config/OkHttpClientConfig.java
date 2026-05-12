package com.ywt.passage.config;

import okhttp3.OkHttpClient;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import javax.net.ssl.SSLContext;
import javax.net.ssl.X509TrustManager;

/**
 * 对外 HTTP 客户端配置
 * 让 OkHttp 与项目的额外信任库保持一致，避免企业代理证书场景下出现单独掉线。
 */
@Configuration
public class OkHttpClientConfig {

    @Bean("imageSearchOkHttpClient")
    public OkHttpClient imageSearchOkHttpClient() {
        OkHttpClient.Builder builder = new OkHttpClient.Builder();
        SSLContext sslContext = ExtraTrustStoreInitializer.getSharedSslContext();
        X509TrustManager trustManager = ExtraTrustStoreInitializer.getSharedTrustManager();

        if (sslContext != null && trustManager != null) {
            builder.sslSocketFactory(sslContext.getSocketFactory(), trustManager);
        }

        return builder.build();
    }
}
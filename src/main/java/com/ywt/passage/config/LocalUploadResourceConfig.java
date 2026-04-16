package com.ywt.passage.config;

import com.ywt.passage.service.LocalImageStorageService;
import jakarta.annotation.Resource;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * 本地上传目录静态资源映射
 */
@Configuration
public class LocalUploadResourceConfig implements WebMvcConfigurer {

    @Resource
    private LocalImageStorageService localImageStorageService;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        String resourceLocation = localImageStorageService.resolveUploadRoot().toUri().toString();
        registry.addResourceHandler("/uploads/**")
                .addResourceLocations(resourceLocation);
    }
}
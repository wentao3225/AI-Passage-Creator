package com.ywt.passage.service;

import com.ywt.passage.model.dto.image.ImageData;
import com.ywt.passage.model.dto.image.ImageRequest;
import com.ywt.passage.model.enums.ImageMethodEnum;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.EnumMap;
import java.util.List;
import java.util.Map;

/**
 * 图片服务策略选择器
 * 根据图片来源类型选择对应的图片服务实现
 * 设计说明：
 * - 自动注册所有 ImageSearchService 实现
 * - 根据 ImageMethodEnum 的元数据自动选择正确的参数
 * - 支持服务可用性检查和自动降级
 * - 统一处理图片上传
 */
@Service
@Slf4j
public class ImageServiceStrategy {

    /**
     * 图片服务映射：ImageMethodEnum -> ImageSearchService
     */
    private final Map<ImageMethodEnum, ImageSearchService> serviceMap = new EnumMap<>(ImageMethodEnum.class);
    @Resource
    private List<ImageSearchService> imageSearchServices;
    @Resource
    private LocalImageStorageService localImageStorageService;

    @PostConstruct
    public void init() {
        // 将所有 ImageSearchService 实现注册到映射表
        for (ImageSearchService service : imageSearchServices) {
            ImageMethodEnum method = service.getMethod();
            serviceMap.put(method, service);
            log.info("注册图片服务: {} -> {} (AI生图: {}, 降级: {})",
                    method.getValue(),
                    service.getClass().getSimpleName(),
                    method.isAiGenerated(),
                    method.isFallback());
        }
    }

    /**
     * 获取图片并保存到本地静态目录
     * 统一处理所有图片来源的下载、解码与落盘逻辑
     *
     * @param imageSource 图片来源
     * @param request     图片请求对象
     * @return 图片获取结果（包含本地访问 URL）
     */
    public ImageResult getImageAndStore(String imageSource, ImageRequest request) {
        ImageMethodEnum method = resolveMethod(imageSource);
        ImageSearchService service = serviceMap.get(method);

        if (service == null || !service.isAvailable()) {
            log.warn("图片服务不可用: {}, 尝试降级", method);
            return handleFallbackWithUpload(request.getPosition());
        }

        try {
            // 获取图片数据
            ImageData imageData = service.getImageData(request);

            if (imageData == null || !imageData.isValid()) {
                log.warn("图片数据获取失败, 使用降级方案, method={}", method);
                return handleFallbackWithUpload(request.getPosition());
            }

            // 保存到本地静态资源目录
            String folder = getFolderForMethod(method);
            String storedUrl = localImageStorageService.uploadImageData(imageData, folder);

            if (storedUrl != null && !storedUrl.isEmpty()) {
                log.info("图片获取并保存成功, method={}, url={}", method, storedUrl);
                return new ImageResult(storedUrl, method);
            } else {
                log.warn("图片保存本地失败, 使用降级方案, method={}", method);
                return handleFallbackWithUpload(request.getPosition());
            }
        } catch (Exception e) {
            log.error("获取图片并上传异常, method={}", method, e);
            return handleFallbackWithUpload(request.getPosition());
        }
    }

    /**
     * 兼容旧调用方的方法名
     */
    public ImageResult getImageAndUpload(String imageSource, ImageRequest request) {
        return getImageAndStore(imageSource, request);
    }

    /**
     * 根据图片方法获取本地目录子文件夹
     */
    private String getFolderForMethod(ImageMethodEnum method) {
        return switch (method) {
            case PEXELS -> "pexels";
            case MERMAID -> "mermaid";
            case ICONIFY -> "iconify";
            case EMOJI_PACK -> "emoji-pack";
            case SVG_DIAGRAM -> "svg-diagram";
            case PICSUM -> "picsum";
        };
    }

    /**
     * 解析图片来源，处理未知值
     */
    private ImageMethodEnum resolveMethod(String imageSource) {
        ImageMethodEnum method = ImageMethodEnum.getByValue(imageSource);
        if (method == null) {
            log.warn("未知的图片来源: {}, 默认使用 {}", imageSource, ImageMethodEnum.getDefaultSearchMethod());
            return ImageMethodEnum.getDefaultSearchMethod();
        }
        return method;
    }

    /**
     * 处理降级逻辑（含上传）
     */
    private ImageResult handleFallbackWithUpload(Integer position) {
        int pos = position != null ? position : 1;
        String fallbackUrl = getFallbackImage(pos);

        // 将降级图片也保存到本地，确保访问链路一致
        ImageData fallbackData = ImageData.fromUrl(fallbackUrl);
        String storedUrl = localImageStorageService.uploadImageData(fallbackData, "fallback");

        // 如果本地保存失败，直接使用原始 URL
        String finalUrl = (storedUrl != null && !storedUrl.isEmpty()) ? storedUrl : fallbackUrl;
        return new ImageResult(finalUrl, ImageMethodEnum.getFallbackMethod());
    }

    /**
     * 获取指定方法的图片服务
     */
    public ImageSearchService getService(ImageMethodEnum method) {
        return serviceMap.get(method);
    }

    /**
     * 获取降级图片
     */
    public String getFallbackImage(int position) {
        ImageSearchService defaultService = serviceMap.get(ImageMethodEnum.getDefaultSearchMethod());
        if (defaultService != null) {
            return defaultService.getFallbackImage(position);
        }
        return String.format("https://picsum.photos/800/600?random=%d", position);
    }

    /**
     * 获取所有已注册的图片服务类型
     */
    public List<ImageMethodEnum> getRegisteredMethods() {
        return List.copyOf(serviceMap.keySet());
    }

    /**
     * 图片获取结果
     */
    public record ImageResult(String url, ImageMethodEnum method) {

        public boolean isSuccess() {
            return url != null && !url.isEmpty();
        }
    }
}

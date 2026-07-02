package com.ywt.passage.agent.tools;

import com.ywt.passage.model.dto.image.ImageRequest;
import com.ywt.passage.service.ImageServiceStrategy;
import com.ywt.passage.utils.GsonUtils;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * 图片搜索工具
 * 封装图片搜索能力，供 Agent 通过 Tool Calling 调用
 */
@Slf4j
@Component
public class ImageSearchTool implements Tool {

    @Resource
    private ImageServiceStrategy imageServiceStrategy;

    @Override
    public String getName() {
        return "image_search";
    }

    @Override
    public String getDescription() {
        return "根据关键词搜索配图。适合需要为文章配图时调用，返回图片 URL。";
    }

    @Override
    public String getParameterDescription() {
        return "{keywords: string (英文搜索关键词), imageSource: string (图片来源，可选 PEXELS/ICONIFY/EMOJI_PACK)}";
    }

    @Override
    public ToolCallResult execute(String args) {
        log.info("ImageSearchTool 执行：args={}", args);
        try {
            //简单解析 args JSON
            @SuppressWarnings("unchecked")
            Map<String, String> argsMap = GsonUtils.getInstance().fromJson(args, Map.class);

            String keywords = argsMap.getOrDefault("keywords", "");
            String imageSource = argsMap.getOrDefault("imageSource", "");

            if (keywords.isBlank()) {
                return ToolCallResult.failure("搜索关键词不能为空");
            }

            //构造 ImageRequest 并调用
            ImageRequest imageRequest = ImageRequest.builder().keywords(keywords).build();

            ImageServiceStrategy.ImageResult result = imageServiceStrategy.getImageAndUpload(imageSource, imageRequest);

            return ToolCallResult.success("搜索成功: 图片来源=" + result.method().getValue()
                    + ", URL=" + result.url()
                    + ", 关键词=" + keywords);

        } catch (Exception e) {
            log.error("ImageSearchTool 执行失败", e);
            return ToolCallResult.failure("图片搜索失败: " + e.getMessage());
        }
    }
}

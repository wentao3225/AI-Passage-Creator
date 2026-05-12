package com.ywt.passage.core.ImageSearch;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.ywt.passage.config.IconifyConfig;
import com.ywt.passage.model.enums.ImageMethodEnum;
import com.ywt.passage.service.ImageSearchService;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

import static com.ywt.passage.constant.ArticleConstant.PICSUM_URL_TEMPLATE;

/**
 * Iconify 图标库检索服务
 * 提供 275k+ 开源图标检索和 SVG 生成
 */
@Service
@Slf4j
public class IconifyService implements ImageSearchService {

    @Resource(name = "imageSearchOkHttpClient")
    private OkHttpClient httpClient;
    @Resource
    private IconifyConfig iconifyConfig;

    @Override
    public String searchImage(String keywords) {
        if (keywords == null || keywords.trim().isEmpty()) {
            log.warn("Iconify 搜索关键词为空");
            return null;
        }

        try {
            for (String query : buildSearchQueries(keywords)) {
                String searchUrl = buildSearchUrl(query);
                String searchResult = callApi(searchUrl);

                if (searchResult == null) {
                    continue;
                }

                String iconName = extractFirstIcon(searchResult);
                if (iconName == null) {
                    continue;
                }

                String svgUrl = buildSvgUrl(iconName);
                log.info("Iconify 图标检索成功: originalKeywords={}, actualQuery={}, icon={}",
                        keywords, query, iconName);
                return svgUrl;
            }

            log.warn("Iconify 未检索到图标: {}", keywords);
            return null;

        } catch (Exception e) {
            log.error("Iconify 图标检索异常, keywords={}", keywords, e);
            return null;
        }
    }

    @Override
    public ImageMethodEnum getMethod() {
        return ImageMethodEnum.ICONIFY;
    }

    @Override
    public String getFallbackImage(int position) {
        return String.format(PICSUM_URL_TEMPLATE, position);
    }

    /**
     * 构建搜索 URL
     */
    private String buildSearchUrl(String keywords) {
        String encodedKeywords = URLEncoder.encode(keywords, StandardCharsets.UTF_8);
        return String.format("%s/search?query=%s&limit=%d",
                iconifyConfig.getApiUrl(),
                encodedKeywords,
                iconifyConfig.getSearchLimit());
    }

    private List<String> buildSearchQueries(String keywords) {
        Set<String> queries = new LinkedHashSet<>();

        String normalized = normalizeKeywords(keywords);
        if (!normalized.isEmpty()) {
            queries.add(normalized);
        }

        String[] tokens = normalized.split("\\s+");
        if (tokens.length >= 2) {
            queries.add(tokens[0] + " " + tokens[1]);
        }

        for (String token : tokens) {
            if (token.length() >= 2) {
                queries.add(token);
            }
        }

        if (queries.isEmpty()) {
            queries.add(keywords.trim());
        }

        return new ArrayList<>(queries);
    }

    private String normalizeKeywords(String keywords) {
        return keywords == null
                ? ""
                : keywords.toLowerCase(Locale.ROOT)
                .replaceAll("[，,、;/|:_-]+", " ")
                .replaceAll("\\s+", " ")
                .trim();
    }

    /**
     * 调用 Iconify API
     */
    private String callApi(String url) {
        try {
            Request request = new Request.Builder()
                    .url(url)
                    .build();

            try (Response response = httpClient.newCall(request).execute()) {
                if (!response.isSuccessful()) {
                    log.error("Iconify API 调用失败: {}", response.code());
                    return null;
                }

                if (response.body() != null) {
                    return response.body().string();
                } else {
                    return null;
                }
            }
        } catch (IOException e) {
            log.error("Iconify API 调用异常", e);
            return null;
        }
    }

    /**
     * 从搜索结果中提取第一个图标名称
     */
    private String extractFirstIcon(String jsonResponse) {
        try {
            JsonObject json = JsonParser.parseString(jsonResponse).getAsJsonObject();
            JsonArray icons = json.getAsJsonArray("icons");

            if (icons == null || icons.isEmpty()) {
                return null;
            }

            return icons.get(0).getAsString();
        } catch (Exception e) {
            log.error("解析 Iconify 搜索结果失败", e);
            return null;
        }
    }

    /**
     * 构建 SVG URL
     *
     * @param iconName 图标名称（格式：prefix:name，如 mdi:home）
     * @return SVG URL
     */
    private String buildSvgUrl(String iconName) {
        // 将 "mdi:home" 转换为 "mdi/home"
        String path = iconName.replace(":", "/");

        StringBuilder url = new StringBuilder(iconifyConfig.getApiUrl())
                .append("/")
                .append(path)
                .append(".svg");

        // 添加高度参数
        boolean hasParams = false;
        if (iconifyConfig.getDefaultHeight() != null && iconifyConfig.getDefaultHeight() > 0) {
            url.append("?height=").append(iconifyConfig.getDefaultHeight());
            hasParams = true;
        }

        // 添加颜色参数（如果配置了）
        if (iconifyConfig.getDefaultColor() != null && !iconifyConfig.getDefaultColor().isEmpty()) {
            url.append(hasParams ? "&" : "?");

            // 处理颜色格式（如 #000000 需要转为 %23000000）
            String color = iconifyConfig.getDefaultColor();
            if (color.startsWith("#")) {
                color = "%23" + color.substring(1);
            }
            url.append("color=").append(color);
        }

        return url.toString();
    }
}

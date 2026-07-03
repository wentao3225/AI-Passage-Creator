package com.ywt.passage.agent.tools;


import com.ywt.passage.utils.GsonUtils;
import lombok.extern.slf4j.Slf4j;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.springframework.stereotype.Component;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Map;

/**
 * 网页搜索工具
 * 供 ContentGeneratorAgent 在 ReAct 循环中调用，搜索实时资料补充正文。
 * <p>
 * 基于 Bing 网页搜索（Jsoup 解析），与 EmojiPackService 同技术栈。
 * 生产环境可接入 Bing Search API / SerpAPI / Tavily 等真实搜索 API。
 */
@Slf4j
@Component
public class WebSearchTool implements Tool {
    @Override
    public String getName() {
        return "web_search";
    }

    @Override
    public String getDescription() {
        return "搜索互联网获取实时信息。适合查找最新数据、新闻、统计数据、事实性内容时调用。";
    }

    @Override
    public String getParameterDescription() {
        return "{query: string (搜索关键词，中文或英文)}";
    }

    @Override
    public ToolCallResult execute(String args) {
        log.info("WebSearchTool 执行: args={}", args);
        try {
            @SuppressWarnings("unchecked")
            Map<String, String> argsMap = GsonUtils.getInstance().fromJson(args, Map.class);
            String query = argsMap.getOrDefault("query", "");
            if (query.isBlank()) {
                return ToolCallResult.failure("搜索关键词不能为空");
            }

            // 调用 Bing 网页搜索
            String searchUrl = "https://www.bing.com/search?q="
                    + URLEncoder.encode(query, StandardCharsets.UTF_8)
                    + "&cc=cn&mkt=zh-CN";

            Document doc = Jsoup.connect(searchUrl)
                    .timeout(10000)
                    .userAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
                    .header("Accept-Language", "zh-CN,zh;q=0.9")
                    .get();

            // Bing 搜索结果容器：li.b_algo
            Elements resultItems = doc.select("li.b_algo");
            StringBuilder sb = new StringBuilder();
            sb.append("【搜索结果】关于「").append(query).append("」:\n");

            int count = 0;
            for (Element item : resultItems) {
                if (count >= 5) break;
                Element titleEl = item.selectFirst("h2 a");
                Element snippetEl = item.selectFirst(".b_caption p");
                if (titleEl != null) {
                    count++;
                    sb.append(count).append(". ").append(titleEl.text()).append("\n");
                    if (snippetEl != null) {
                        sb.append("   ").append(snippetEl.text()).append("\n");
                    }
                    sb.append("\n");
                }
            }

            if (count == 0) {
                sb.append("未找到相关结果，请换关键词重试。\n");
            }

            String result = sb.toString();
            log.info("WebSearchTool 搜索完成: query={}, results={}", query, count);
            return ToolCallResult.success(result);

        } catch (Exception e) {
            log.error("WebSearchTool 搜索失败", e);
            return ToolCallResult.failure("搜索失败: " + e.getMessage());
        }
    }
}

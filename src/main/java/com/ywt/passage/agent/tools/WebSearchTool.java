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
 * 注意：当前为模拟实现，返回占位搜索结果。
 * 生产环境可接入 SerpAPI / Bing Search API / Tavily 等真实搜索引擎。
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

            // 调用 DuckDuckGo Lite 搜索
            String searchUrl = "https://lite.duckduckgo.com/lite/?q="
                    + URLEncoder.encode(query, StandardCharsets.UTF_8);

            Document doc = Jsoup.connect(searchUrl)
                    .timeout(10000)
                    .userAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
                    .get();

            // DuckDuckGo Lite 结果结构：
            // <table> 中每行一个结果：<a> 是标题, <td> 是摘要
            Elements results = doc.select("table tr");
            StringBuilder sb = new StringBuilder();
            sb.append("【搜索结果】关于「").append(query).append("」:\n");

            int count = 0;
            for (Element row : results) {
                Elements links = row.select("a.result-link");
                Elements snippets = row.select("td.result-snippet");
                if (!links.isEmpty() && !snippets.isEmpty() && count < 5) {
                    count++;
                    sb.append(count).append(". ").append(links.text()).append("\n");
                    sb.append("   ").append(snippets.text()).append("\n\n");
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

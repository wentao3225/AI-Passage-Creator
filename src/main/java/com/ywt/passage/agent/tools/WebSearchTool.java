package com.ywt.passage.agent.tools;


import com.ywt.passage.utils.GsonUtils;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

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
            Map<String, String> argsMap = GsonUtils.getInstance()
                    .fromJson(args, Map.class);
            String query = argsMap.getOrDefault("query", "");
            if (query.isBlank()) {
                return ToolCallResult.failure("搜索关键词不能为空");
            }
            // **** 模拟搜索结果 ****
            // 真实环境下这里应调用搜索引擎 API
            String mockResult = String.format(
                    """
                            【搜索结果】关于「%s」的相关信息：
                            - 根据公开资料显示，这是一个当前热门话题
                            - 建议在正文中引用权威来源以获得更准确的数据
                            - 搜索结果摘要：%s 涉及多个维度的讨论和分析""",
                    query, query
            );
            log.info("WebSearchTool 搜索完成: query={}", query);
            return ToolCallResult.success(mockResult);
        } catch (Exception e) {
            log.error("WebSearchTool 执行失败", e);
            return ToolCallResult.failure("搜索失败: " + e.getMessage());
        }
    }
}

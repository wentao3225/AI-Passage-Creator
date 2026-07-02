package com.ywt.passage.agent.tools;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.*;

/**
 * 工具注册中心
 * 管理所有可供 Agent 调用的工具
 * 运行时内存组件，不需要持久化
 */
@Component
@Slf4j
public class ToolRegistry {

    private final Map<String, Tool> toolMap = new HashMap<>();

    @Resource
    private List<Tool> toolList;

    @PostConstruct
    public void init() {
        if (toolList != null) {
            for (Tool tool : toolList) {
                register(tool);
            }
        }
        log.info("ToolRegistry 初始化完成，已注册 {} 个工具", toolMap.size());
    }

    /**
     * 注册工具
     */
    public void register(Tool tool) {
        if (tool == null || tool.getName() == null) {
            return;
        }
        toolMap.put(tool.getName(), tool);
        log.info("工具已注册: name={}, description={}", tool.getName(), tool.getDescription());
    }

    /**
     * 根据名称获取工具
     */
    public Optional<Tool> getTool(String name) {
        return Optional.ofNullable(toolMap.get(name));
    }

    /**
     * 获取所有已注册工具
     */
    public List<Tool> getAllTool() {
        return new ArrayList<>(toolMap.values());
    }

    /**
     * 获取所有工具的描述文本（给 LLM 看）
     * 格式：
     *   - image_search: 搜索图片。参数: {keywords: string}
     *   - svg_generator: 生成 SVG 示意图。参数: {prompt: string}
     */
    public String getToolsDescriptionForLLM() {
        if (toolMap.isEmpty()) {
            return "（无可用工具）";
        }
        StringBuilder sb = new StringBuilder();
        for (Tool tool : toolMap.values()) {
            sb.append("  - ").append(tool.getName())
                    .append(": ").append(tool.getDescription())
                    .append(" 参数: ").append(tool.getParameterDescription())
                    .append("\n");
        }
        return sb.toString();
    }

    /**
     * 调用工具
     *
     * @param toolName 工具名称
     * @param args     工具参数（JSON 字符串）
     * @return 调用结果
     */
    public ToolCallResult callTool(String toolName, String args) {
        Optional<Tool> toolOpt = getTool(toolName);
        if (toolOpt.isEmpty()) {
            log.warn("工具不存在: name={}", toolName);
            return ToolCallResult.failure("工具不存在: " + toolName);
        }

        log.info("调用工具: name={}, args={}", toolName, args);
        try {
            ToolCallResult result = toolOpt.get().execute(args);
            log.info("工具调用完成: name={}, success={}", toolName, result.isSuccess());
            return result;
        } catch (Exception e) {
            log.error("工具调用异常: name={}", toolName, e);
            return ToolCallResult.failure("工具调用异常: " + e.getMessage());
        }
    }
}

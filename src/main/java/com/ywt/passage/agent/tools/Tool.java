package com.ywt.passage.agent.tools;


/**
 * 工具接口
 * 所有 Agent 可调用的工具都实现此接口
 */
public interface Tool {

    /**
     * 工具名称，用于 LLM 决策匹配
     * 例如 "image_search"、"svg_generator"、"web_search"
     */
    String getName();

    /**
     * 工具描述，用于给 LLM 看
     * 说明这个工具能做什么、什么时候该用它
     */
    String getDescription();

    /**
     * 参数描述，描述这个工具的参数结构
     * LLM 通过它知道要传什么参数
     */
    String getParameterDescription();

    /**
     * 执行工具
     *
     * @param args 参数字符串（LLM 输出的参数部分，JSON 格式）
     * @return 工具执行结果
     */
    ToolCallResult execute(String args);
}

package com.ywt.passage.agent.tools;


import lombok.AllArgsConstructor;
import lombok.Data;

/**
 * 工具调用结果
 */
@Data
@AllArgsConstructor
public class ToolCallResult {
    /**
     * 是否成功
     */
    private boolean success;
    /**
     * 结果数据（文本格式，由调用方按需解析）
     */
    private String data;
    /**
     * 错误信息（失败时填充）
     */
    private String error;

    public static ToolCallResult success(String data) {
        return new ToolCallResult(true, data, null);
    }

    public static ToolCallResult failure(String error) {
        return new ToolCallResult(false, null, error);
    }
}

package com.ywt.passage.service;

import com.ywt.passage.entity.AgentLog;
import com.ywt.passage.model.vo.AgentExecutionStats;

import java.util.List;

/**
 * 智能体执行日志服务
 */
public interface AgentLogService {

    /**
     * 异步保存日志
     *
     * @param log 日志对象
     */
    void saveLogAsync(AgentLog log);

    /**
     * 根据任务ID获取所有日志
     *
     * @param taskId 任务ID
     * @return 日志列表
     */
    List<AgentLog> getLogsByTaskId(String taskId);

    /**
     * 获取任务执行统计信息
     *
     * @param taskId 任务ID
     * @return 执行统计
     */
    AgentExecutionStats getExecutionStats(String taskId);
}

package com.ywt.passage.model.dto.article;

import lombok.Data;

import java.io.Serial;
import java.io.Serializable;

/**
 * 从指定阶段重跑文章请求
 */
@Data
public class ArticleRestartPhaseRequest implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    /**
     * 任务 ID
     */
    private String taskId;

    /**
     * 目标阶段，仅支持 TITLE_GENERATING / OUTLINE_GENERATING / CONTENT_GENERATING
     */
    private String targetPhase;
}
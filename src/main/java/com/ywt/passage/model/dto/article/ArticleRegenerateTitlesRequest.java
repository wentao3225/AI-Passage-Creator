package com.ywt.passage.model.dto.article;

import lombok.Data;

import java.io.Serial;
import java.io.Serializable;

/**
 * 重新生成标题请求
 */
@Data
public class ArticleRegenerateTitlesRequest implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    /**
     * 任务ID
     */
    private String taskId;
}
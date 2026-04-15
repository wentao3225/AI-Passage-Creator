package com.ywt.passage.model.dto.article;

import lombok.Data;

import java.io.Serial;
import java.io.Serializable;

/**
 * AI 修改大纲请求
 */
@Data
public class ArticleAiModifyOutlineRequest implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    /**
     * 任务ID
     */
    private String taskId;

    /**
     * 用户的修改建议
     */
    private String modifySuggestion;
}

package com.ywt.passage.model.dto.article;

import lombok.Data;

import java.io.Serial;
import java.io.Serializable;
import java.util.List;

/**
 * 确认大纲请求
 */
@Data
public class ArticleConfirmOutlineRequest implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    /**
     * 任务ID
     */
    private String taskId;

    /**
     * 用户编辑后的大纲
     */
    private List<ArticleState.OutlineSection> outline;
}

package com.ywt.passage.model.dto.article;

import lombok.Data;

import java.io.Serial;
import java.io.Serializable;

/**
 * 确认标题请求
 */
@Data
public class ArticleConfirmTitleRequest implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    /**
     * 任务ID
     */
    private String taskId;

    /**
     * 选中的主标题
     */
    private String selectedMainTitle;

    /**
     * 选中的副标题
     */
    private String selectedSubTitle;

    /**
     * 用户补充描述（可选）
     */
    private String userDescription;
}

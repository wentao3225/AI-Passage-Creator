package com.ywt.passage.common;

import lombok.Data;

import java.io.Serial;
import java.io.Serializable;

/**
 * 分页请求
 */
@Data
public class PageRequest implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    /**
     * 当前页号
     */
    private long current = 1;

    /**
     * 页面大小
     */
    private long pageSize = 10;

    /**
     * 排序字段
     */
    private String sortField;

    /**
     * 排序顺序（ascend / descend）
     */
    private String sortOrder;
}

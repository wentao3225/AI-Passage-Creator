package com.ywt.passage.model.dto.user;

import com.ywt.passage.common.PageRequest;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.io.Serial;
import java.io.Serializable;

/**
 * 管理员分页查询用户请求
 */
@EqualsAndHashCode(callSuper = true)
@Data
public class UserQueryRequest extends PageRequest implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    /**
     * 用户账号（模糊匹配）
     */
    private String userAccount;

    /**
     * 用户昵称（模糊匹配）
     */
    private String userName;

    /**
     * 用户角色（精确匹配）
     */
    private String userRole;
}

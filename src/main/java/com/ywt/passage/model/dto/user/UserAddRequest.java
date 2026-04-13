package com.ywt.passage.model.dto.user;

import lombok.Data;

import java.io.Serializable;

/**
 * 管理员创建用户请求
 */
@Data
public class UserAddRequest implements Serializable {

    private String userAccount;

    private String userPassword;

    private String userName;

    private String userAvatar;

    private String userProfile;

    private String userRole;
}

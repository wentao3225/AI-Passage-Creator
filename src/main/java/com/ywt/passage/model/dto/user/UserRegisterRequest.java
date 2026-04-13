package com.ywt.passage.model.dto.user;

import lombok.Data;

import java.io.Serializable;

/**
 * 用户登录请求
 */
@Data
public class UserRegisterRequest implements Serializable {
    private String userAccount;
    private String userPassword;
    private String checkPassword;
}

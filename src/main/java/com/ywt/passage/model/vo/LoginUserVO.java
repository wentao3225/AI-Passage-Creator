package com.ywt.passage.model.vo;

import lombok.Data;

import java.io.Serializable;
import java.time.LocalDateTime;

/**
 * 登录用户视图
 */
@Data
public class LoginUserVO implements Serializable {
    private Long id;
    private String userAccount;
    private String userName;
    private String userAvatar;
    private String userProfile;
    private String userRole;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
}

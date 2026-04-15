package com.ywt.passage.model.vo;

import cn.hutool.core.bean.BeanUtil;
import com.ywt.passage.entity.User;
import lombok.Data;

import java.io.Serial;
import java.io.Serializable;
import java.time.LocalDateTime;

/**
 * 管理员侧用户视图
 */
@Data
public class UserManageVO implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    private Long id;
    private String userAccount;
    private String userName;
    private String userAvatar;
    private String userProfile;
    private String userRole;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;

    /**
     * 实体转 VO
     */
    public static UserManageVO objToVo(User user) {
        if (user == null) {
            return null;
        }
        UserManageVO userManageVO = new UserManageVO();
        BeanUtil.copyProperties(user, userManageVO);
        return userManageVO;
    }
}

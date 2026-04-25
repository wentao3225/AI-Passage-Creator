package com.ywt.passage.model.enums;

import lombok.Getter;

/**
 * 用户角色枚举
 */
@Getter
public enum UserRoleEnum {

    USER("user", "普通用户"),
    ADMIN("admin", "管理员");

    private final String value;
    private final String text;

    UserRoleEnum(String value, String text) {
        this.value = value;
        this.text = text;
    }

    public static UserRoleEnum getEnumByValue(String mustRole) {
        for (UserRoleEnum value : values()) {
            if (value.value.equals(mustRole)) {
                return value;
            }
        }
        return null;
    }
}

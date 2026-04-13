package com.ywt.passage.exception;

/**
 * 异常工具类
 */
public class ThrowUtils {

    private ThrowUtils() {
    }

    public static void throwIf(boolean condition, RuntimeException runtimeException) {
        if (condition) {
            throw runtimeException;
        }
    }

    public static void throwIf(boolean condition, ErrorCode errorCode) {
        throwIf(condition, new BusinessException(errorCode));
    }

    public static void throwIf(boolean condition, ErrorCode errorCode, String description) {
        throwIf(condition, new BusinessException(errorCode, description));
    }
}

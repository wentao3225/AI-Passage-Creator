package com.ywt.passage.common;

import com.ywt.passage.exception.ErrorCode;

/**
 * 响应工具类
 */
public class ResultUtils {

    private ResultUtils() {
    }

    public static <T> BaseResponse<T> success(T data) {
        return new BaseResponse<>(0, data, "ok");
    }

    public static BaseResponse<Boolean> success() {
        return new BaseResponse<>(0, true, "ok");
    }

    public static BaseResponse<?> error(ErrorCode errorCode) {
        return new BaseResponse<>(errorCode.getCode(), null, errorCode.getMessage());
    }

    public static BaseResponse<?> error(int code, String message) {
        return new BaseResponse<>(code, null, message);
    }
}

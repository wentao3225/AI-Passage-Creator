package com.ywt.passage.controller;

import com.mybatisflex.core.paginate.Page;
import com.ywt.passage.annotation.AuthCheck;
import com.ywt.passage.common.BaseResponse;
import com.ywt.passage.common.DeleteRequest;
import com.ywt.passage.common.ResultUtils;
import com.ywt.passage.constant.UserConstant;
import com.ywt.passage.entity.User;
import com.ywt.passage.exception.ErrorCode;
import com.ywt.passage.exception.ThrowUtils;
import com.ywt.passage.model.dto.user.UserAddRequest;
import com.ywt.passage.model.dto.user.UserLoginRequest;
import com.ywt.passage.model.dto.user.UserQueryRequest;
import com.ywt.passage.model.dto.user.UserRegisterRequest;
import com.ywt.passage.model.dto.user.UserUpdateRequest;
import com.ywt.passage.model.vo.LoginUserVO;
import com.ywt.passage.model.vo.UserManageVO;
import com.ywt.passage.service.UserService;
import jakarta.annotation.Resource;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

/**
 * 用户接口
 */
@RestController
@RequestMapping("/user")
public class UserController {

    @Resource
    private UserService userService;

    /**
     * 用户注册
     */
    @PostMapping("/register")
    public BaseResponse<Long> userRegister(@RequestBody UserRegisterRequest userRegisterRequest) {
        ThrowUtils.throwIf(userRegisterRequest == null, ErrorCode.PARAMS_ERROR);
        String userAccount = userRegisterRequest.getUserAccount();
        String userPassword = userRegisterRequest.getUserPassword();
        String checkPassword = userRegisterRequest.getCheckPassword();
        long result = userService.userRegister(userAccount, userPassword, checkPassword);
        return ResultUtils.success(result);
    }

    /**
     * 用户登录
     */
    @PostMapping("/login")
    public BaseResponse<LoginUserVO> userLogin(@RequestBody UserLoginRequest userLoginRequest,
            HttpServletRequest request) {
        ThrowUtils.throwIf(userLoginRequest == null, ErrorCode.PARAMS_ERROR);
        String userAccount = userLoginRequest.getUserAccount();
        String userPassword = userLoginRequest.getUserPassword();
        LoginUserVO loginUserVO = userService.userLogin(userAccount, userPassword, request);
        return ResultUtils.success(loginUserVO);
    }

    /**
     * 获取当前登录用户
     */
    @GetMapping("/get/login")
    public BaseResponse<LoginUserVO> getLoginUser(HttpServletRequest request) {
        User loginUser = userService.getLoginUser(request);
        return ResultUtils.success(userService.getLoginUserVO(loginUser));
    }

    /**
     * 用户注销
     */
    @PostMapping("/logout")
    public BaseResponse<Boolean> userLogout(HttpServletRequest request) {
        ThrowUtils.throwIf(request == null, ErrorCode.PARAMS_ERROR);
        boolean result = userService.userLogout(request);
        return ResultUtils.success(result);
    }

    /**
     * 创建用户（管理员）
     */
    @PostMapping("/add")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    public BaseResponse<Long> addUser(@RequestBody UserAddRequest userAddRequest) {
        long userId = userService.addUser(userAddRequest);
        return ResultUtils.success(userId);
    }

    /**
     * 分页查询用户（管理员）
     */
    @PostMapping("/list/page")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    public BaseResponse<Page<UserManageVO>> listUserByPage(@RequestBody UserQueryRequest userQueryRequest) {
        ThrowUtils.throwIf(userQueryRequest == null, ErrorCode.PARAMS_ERROR);
        Page<UserManageVO> userVOPage = userService.listUserByPage(userQueryRequest);
        return ResultUtils.success(userVOPage);
    }

    /**
     * 更新用户（管理员）
     */
    @PostMapping("/update")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    public BaseResponse<Boolean> updateUser(@RequestBody UserUpdateRequest userUpdateRequest,
                                            HttpServletRequest request) {
        ThrowUtils.throwIf(userUpdateRequest == null || userUpdateRequest.getId() == null,
                ErrorCode.PARAMS_ERROR);
        User loginUser = userService.getLoginUser(request);
        boolean result = userService.updateUser(userUpdateRequest, loginUser);
        return ResultUtils.success(result);
    }

    /**
     * 删除用户（管理员）
     */
    @PostMapping("/delete")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    public BaseResponse<Boolean> deleteUser(@RequestBody DeleteRequest deleteRequest,
                                            HttpServletRequest request) {
        ThrowUtils.throwIf(deleteRequest == null || deleteRequest.getId() == null, ErrorCode.PARAMS_ERROR);
        User loginUser = userService.getLoginUser(request);
        boolean result = userService.deleteUser(deleteRequest.getId(), loginUser);
        return ResultUtils.success(result);
    }
}

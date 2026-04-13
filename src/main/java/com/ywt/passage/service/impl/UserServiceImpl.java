package com.ywt.passage.service.impl;

import cn.hutool.core.bean.BeanUtil;
import cn.hutool.core.util.StrUtil;
import com.mybatisflex.core.query.QueryWrapper;
import com.mybatisflex.spring.service.impl.ServiceImpl;
import com.ywt.passage.entity.User;
import com.ywt.passage.enums.UserRoleEnum;
import com.ywt.passage.exception.BusinessException;
import com.ywt.passage.exception.ErrorCode;
import com.ywt.passage.mapper.UserMapper;
import com.ywt.passage.model.dto.user.UserAddRequest;
import com.ywt.passage.model.vo.LoginUserVO;
import com.ywt.passage.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Service;
import org.springframework.util.DigestUtils;

import java.nio.charset.StandardCharsets;

import static com.ywt.passage.constant.UserConstant.DEFAULT_ROLE;
import static com.ywt.passage.constant.UserConstant.USER_LOGIN_STATE;

/**
 * 用户服务实现
 */
@Service
public class UserServiceImpl extends ServiceImpl<UserMapper, User> implements UserService {


    /**
     * 用户登录
     *
     * @param userAccount  账号
     * @param userPassword 密码
     * @param request      请求
     * @return 登录用户信息
     */
    @Override
    public LoginUserVO userLogin(String userAccount, String userPassword, HttpServletRequest request) {
        // 校验参数
        if (StrUtil.hasBlank(userAccount, userPassword)) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "参数为空");
        }
        // 加密
        String encryptPassword = getEncryptPassword(userPassword);
        // 查询用户是否存在
        QueryWrapper queryWrapper = new QueryWrapper();
        queryWrapper.eq("userAccount", userAccount);
        queryWrapper.eq("userPassword", encryptPassword);
        User user = this.mapper.selectOneByQuery(queryWrapper);
        if (user == null) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "用户不存在或密码错误");
        }
        // 记录用户的登录态
        request.getSession().setAttribute(USER_LOGIN_STATE, user);
        // 返回脱敏的用户信息
        return this.getLoginUserVO(user);
    }


    /**
     * 用户注册
     *
     * @param userAccount   账号
     * @param userPassword  密码
     * @param checkPassword 确认密码
     * @return 用户id
     */
    @Override
    public long userRegister(String userAccount, String userPassword, String checkPassword) {
        // 校验参数
        if (StrUtil.hasBlank(userAccount, userPassword, checkPassword)) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "参数为空");
        }
        if (userAccount.length() < 4) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "账号长度过短");
        }
        if (userPassword.length() < 8 || checkPassword.length() < 8) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "密码长度过短");
        }
        if (!userPassword.equals(checkPassword)) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "两次输入的密码不一致");
        }
        // 查询用户是否已存在
        QueryWrapper queryWrapper = new QueryWrapper();
        queryWrapper.eq("userAccount", userAccount);
        long count = this.mapper.selectCountByQuery(queryWrapper);
        if (count > 0) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "账号重复");
        }
        // 加密密码
        String encryptPassword = getEncryptPassword(userPassword);
        // 创建用户，插入数据库
        User user = new User();
        user.setUserAccount(userAccount);
        user.setUserPassword(encryptPassword);
        user.setUserName("无名");
        user.setUserRole(UserRoleEnum.USER.getValue());
        boolean saveResult = this.save(user);
        if (!saveResult) {
            throw new BusinessException(ErrorCode.OPERATION_ERROR, "注册失败，数据库错误");
        }
        return user.getId();
    }

    /**
     * 获取当前登录用户
     *
     * @param request 请求
     * @return 当前登录用户
     */
    @Override
    public User getLoginUser(HttpServletRequest request) {
        // 先判断用户是否登录
        Object userObj = request.getSession().getAttribute(USER_LOGIN_STATE);
        User currentUser = (User) userObj;
        if (currentUser == null || currentUser.getId() == null) {
            throw new BusinessException(ErrorCode.NOT_LOGIN_ERROR);
        }
        // 从数据库查询当前用户信息（保证数据最新）
        long userId = currentUser.getId();
        currentUser = this.getById(userId);
        if (currentUser == null) {
            throw new BusinessException(ErrorCode.NOT_LOGIN_ERROR);
        }
        return currentUser;
    }


    /**
     * 用户注销
     *
     * @param request 请求
     * @return 是否注销成功
     */
    @Override
    public boolean userLogout(HttpServletRequest request) {
        Object userObj = request.getSession().getAttribute(USER_LOGIN_STATE);
        if (userObj == null) {
            throw new BusinessException(ErrorCode.OPERATION_ERROR, "用户未登录");
        }
        request.getSession().removeAttribute(USER_LOGIN_STATE);
        return true;
    }

    /**
     * 获取脱敏用户信息
     *
     * @param user 用户信息
     * @return 脱敏用户信息
     */
    @Override
    public LoginUserVO getLoginUserVO(User user) {
        if (user == null) {
            return null;
        }
        LoginUserVO loginUserVO = new LoginUserVO();
        BeanUtil.copyProperties(user, loginUserVO);
        return loginUserVO;
    }

    /**
     * 创建用户（管理员）
     *
     * @param userAddRequest 创建用户请求
     * @return 用户id
     */
    @Override
    public long addUser(UserAddRequest userAddRequest) {
        if (userAddRequest == null) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "参数为空");
        }
        String userAccount = userAddRequest.getUserAccount();
        String userPassword = userAddRequest.getUserPassword();
        if (StrUtil.hasBlank(userAccount, userPassword)) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "参数为空");
        }
        String userRole = userAddRequest.getUserRole();
        if (StrUtil.isNotBlank(userRole) && UserRoleEnum.getEnumByValue(userRole) == null) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "用户角色不合法");
        }

        // 复用注册流程，统一账号校验和密码加密
        long userId = this.userRegister(userAccount, userPassword, userPassword);
        User user = new User();
        user.setId(userId);
        user.setUserName(userAddRequest.getUserName());
        user.setUserAvatar(userAddRequest.getUserAvatar());
        user.setUserProfile(userAddRequest.getUserProfile());
        user.setUserRole(StrUtil.isBlank(userRole) ? DEFAULT_ROLE : userRole);
        boolean updateResult = this.updateById(user);
        if (!updateResult) {
            throw new BusinessException(ErrorCode.OPERATION_ERROR, "创建用户失败");
        }
        return userId;
    }

    /**
     * 删除用户（管理员）
     *
     * @param id 用户id
     * @return 是否成功
     */
    @Override
    public boolean deleteUser(long id) {
        if (id <= 0) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "用户id不合法");
        }
        boolean result = this.removeById(id);
        if (!result) {
            throw new BusinessException(ErrorCode.OPERATION_ERROR, "删除失败");
        }
        return true;
    }

    /**
     * 获取加密密码
     *
     * @param userPassword 密码
     * @return 加密后的密码
     */
    private String getEncryptPassword(String userPassword) {
        // 盐值，混淆密码
        final String SALT = "yupi";
        return DigestUtils.md5DigestAsHex((userPassword + SALT).getBytes(StandardCharsets.UTF_8));
    }
}

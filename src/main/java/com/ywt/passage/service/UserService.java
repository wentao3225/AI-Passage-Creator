package com.ywt.passage.service;

import com.mybatisflex.core.service.IService;
import com.ywt.passage.model.dto.user.UserAddRequest;
import com.ywt.passage.entity.User;
import com.ywt.passage.model.vo.LoginUserVO;
import jakarta.servlet.http.HttpServletRequest;

public interface UserService extends IService<User> {


    LoginUserVO userLogin(String userAccount, String userPassword, HttpServletRequest request);

    long userRegister(String userAccount, String userPassword, String checkPassword);

    User getLoginUser(HttpServletRequest request);

    boolean userLogout(HttpServletRequest request);

    LoginUserVO getLoginUserVO(User user);

    long addUser(UserAddRequest userAddRequest);

    boolean deleteUser(long id);
}

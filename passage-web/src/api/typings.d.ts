declare namespace API {
  type BaseResponseBoolean = {
    code?: number;
    data?: boolean;
    message?: string;
  };

  type BaseResponseLoginUserVO = {
    code?: number;
    data?: LoginUserVO;
    message?: string;
  };

  type BaseResponseLong = {
    code?: number;
    data?: number;
    message?: string;
  };

  type DeleteRequest = {
    id?: number;
  };

  type LoginUserVO = {
    id?: number;
    userAccount?: string;
    userName?: string;
    userAvatar?: string;
    userProfile?: string;
    userRole?: string;
    createTime?: string;
    updateTime?: string;
  };

  type UserAddRequest = {
    userAccount?: string;
    userPassword?: string;
    userName?: string;
    userAvatar?: string;
    userProfile?: string;
    userRole?: string;
  };

  type UserLoginRequest = {
    userAccount?: string;
    userPassword?: string;
  };

  type UserRegisterRequest = {
    userAccount?: string;
    userPassword?: string;
    checkPassword?: string;
  };
}

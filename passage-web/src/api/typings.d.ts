declare namespace API {
  type ArticleCreateRequest = {
    topic?: string;
    style?: string;
    enabledImageMethods?: string[];
  };

  type ArticleQueryRequest = {
    current?: number;
    pageSize?: number;
    sortField?: string;
    sortOrder?: string;
    userId?: number;
    status?: string;
  };

  type ArticleVO = {
    id?: number;
    taskId?: string;
    userId?: number;
    topic?: string;
    userDescription?: string;
    mainTitle?: string;
    subTitle?: string;
    titleOptions?: TitleOption[];
    outline?: OutlineItem[];
    content?: string;
    fullContent?: string;
    coverImage?: string;
    images?: ImageItem[];
    status?: string;
    phase?: string;
    errorMessage?: string;
    createTime?: string;
    completedTime?: string;
  };

  type BaseResponseArticleVO = {
    code?: number;
    data?: ArticleVO;
    message?: string;
  };

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

  type BaseResponsePageUserManageVO = {
    code?: number;
    data?: PageUserManageVO;
    message?: string;
  };

  type BaseResponsePageArticleVO = {
    code?: number;
    data?: PageArticleVO;
    message?: string;
  };

  type BaseResponseString = {
    code?: number;
    data?: string;
    message?: string;
  };

  type DeleteRequest = {
    id?: number;
  };

  type getArticleParams = {
    taskId: string;
  };

  type getProgressParams = {
    taskId: string;
  };

  type ImageItem = {
    position?: number;
    url?: string;
    method?: string;
    keywords?: string;
    sectionTitle?: string;
    description?: string;
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

  type OutlineItem = {
    section?: number;
    title?: string;
    points?: string[];
  };

  type PageArticleVO = {
    records?: ArticleVO[];
    pageNumber?: number;
    pageSize?: number;
    totalPage?: number;
    totalRow?: number;
    optimizeCountQuery?: boolean;
  };

  type PageUserManageVO = {
    records?: UserManageVO[];
    pageNumber?: number;
    pageSize?: number;
    totalPage?: number;
    totalRow?: number;
    optimizeCountQuery?: boolean;
  };

  type SseEmitter = {
    timeout?: number;
  };

  type TitleOption = {
    mainTitle?: string;
    subTitle?: string;
  };

  type UserAddRequest = {
    userAccount?: string;
    userPassword?: string;
    userName?: string;
    userAvatar?: string;
    userProfile?: string;
    userRole?: string;
  };

  type UserManageVO = {
    id?: number;
    userAccount?: string;
    userName?: string;
    userAvatar?: string;
    userProfile?: string;
    userRole?: string;
    createTime?: string;
    updateTime?: string;
  };

  type UserQueryRequest = {
    current?: number;
    pageSize?: number;
    sortField?: string;
    sortOrder?: string;
    userAccount?: string;
    userName?: string;
    userRole?: string;
  };

  type UserUpdateRequest = {
    id?: number;
    userAccount?: string;
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

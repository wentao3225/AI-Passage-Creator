create table article
(
    id            bigint auto_increment comment 'id'
        primary key,
    taskId        varchar(64)                           not null comment '任务ID（UUID）',
    userId        bigint                                not null comment '用户ID',
    topic         varchar(500)                          not null comment '选题',
    mainTitle     varchar(200)                          null comment '主标题',
    subTitle      varchar(300)                          null comment '副标题',
    outline       json                                  null comment '大纲（JSON格式）',
    content       text                                  null comment '正文（Markdown格式）',
    fullContent   text                                  null comment '完整图文（Markdown格式，含配图）',
    coverImage    varchar(512)                          null comment '封面图 URL',
    images        json                                  null comment '配图列表（JSON数组）',
    status        varchar(20) default 'PENDING'         not null comment '状态：PENDING/PROCESSING/COMPLETED/FAILED',
    errorMessage  text                                  null comment '错误信息',
    createTime    datetime    default CURRENT_TIMESTAMP not null comment '创建时间',
    completedTime datetime                              null comment '完成时间',
    updateTime    datetime    default CURRENT_TIMESTAMP not null on update CURRENT_TIMESTAMP comment '更新时间',
    isDelete      tinyint     default 0                 not null comment '是否删除',
    constraint uk_taskId
        unique (taskId)
)
    comment '文章表' collate = utf8mb4_unicode_ci;

create index idx_createTime
    on article (createTime);

create index idx_status
    on article (status);

create index idx_userId
    on article (userId);

create index idx_userId_status
    on article (userId, status);

create table user
(
    id           bigint auto_increment comment 'id'
        primary key,
    userAccount  varchar(256)                           not null comment '账号',
    userPassword varchar(512)                           not null comment '密码',
    userName     varchar(256)                           null comment '用户昵称',
    userAvatar   varchar(1024)                          null comment '用户头像',
    userProfile  varchar(512)                           null comment '用户简介',
    userRole     varchar(256) default 'user'            not null comment '用户角色：user/admin',
    createTime   datetime     default CURRENT_TIMESTAMP not null comment '创建时间',
    updateTime   datetime     default CURRENT_TIMESTAMP not null on update CURRENT_TIMESTAMP comment '更新时间',
    isDelete     tinyint      default 0                 not null comment '是否删除',
    constraint uk_userAccount
        unique (userAccount)
)
    comment '用户' collate = utf8mb4_unicode_ci;

create index idx_userName
    on user (userName);


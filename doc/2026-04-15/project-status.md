# AI-Passage-Creator 项目功能现状（交接文档）

- 更新时间：2026-04-15
- 适用目标：新开对话时，快速了解“当前能跑什么、核心链路在哪、有哪些风险与下一步”。

## 1. 当前状态一句话

项目已具备 **用户登录 + 文章 AI 生成（异步 + SSE）+ 文章历史/详情/导出 + 管理员用户管理** 的主流程能力，属于“可演示、可联调、可继续迭代”的阶段。

## 2. 技术栈与运行基线

### 后端

- Java 21
- Spring Boot 3.5.10
- MyBatis-Flex
- Redis Session
- Spring AOP（`@AuthCheck`）
- Spring AI Alibaba（DashScope）

### 前端

- Vue 3 + TypeScript + Vite
- Ant Design Vue
- Pinia + Vue Router
- Axios
- SSE（EventSource）

### 环境关键点

- 后端默认地址：`http://localhost:8567/api`
- MySQL 数据库：`passage`
- Redis：`localhost:6379`
- `application.yaml` 通过 `spring.config.import` 引入 `application-local.yaml`
- `application-local.yaml` 已加入 Git 忽略（避免本地密钥提交）

## 3. 已实现功能清单

### 3.1 用户体系与权限

- 用户注册：`/user/register`
- 用户登录：`/user/login`
- 获取当前登录用户：`/user/get/login`
- 用户登出：`/user/logout`
- 基于 Session 的登录态维护（Redis）
- 前端全局路由守卫：管理员路由先拉登录态再判权
- 非管理员访问 `/admin/*` 会被拦截并跳转登录

### 3.2 文章创作主链路（核心）

- 创建任务：`/article/create`
- 服务端异步执行生成流程（线程池 `articleExecutor`）
- SSE 实时进度：`/article/progress/{taskId}`
- 生成阶段包括：
  1. 标题生成
  2. 大纲流式输出
  3. 正文流式输出
  4. 配图需求分析
  5. 配图检索
  6. 图文合成
- 任务状态：`PENDING` / `PROCESSING` / `COMPLETED` / `FAILED`

### 3.3 文章管理能力

- 文章详情：`/article/{taskId}`
- 文章分页列表：`/article/list`
- 文章删除：`/article/delete`
- 前端页面：
  - 首页（支持快速发起创作、展示最近文章）
  - 创作页（流式内容渲染）
  - 列表页（筛选、删除、导出）
  - 详情页（完整图文展示、导出 Markdown、失败重试）

### 3.4 管理员用户管理（近期重点）

- 管理员接口：
  - 新增用户：`/user/add`
  - 分页查询用户：`/user/list/page`
  - 更新用户：`/user/update`
  - 删除用户：`/user/delete`
- 前端页面：`/admin/userManage`
- 已包含能力：筛选、分页、增删改弹窗、角色管理
- 后端已包含防护逻辑：不能删自己、不能把自己降级出管理员

## 4. 当前可访问路由（前端）

- `/` 主页
- `/create` 创作文章
- `/article/list` 文章列表
- `/article/:taskId` 文章详情
- `/user/login` 登录
- `/user/register` 注册
- `/admin/userManage` 管理员用户管理

## 5. 数据模型现状（核心表）

### article

- 主键 `id`
- 任务标识 `taskId`（唯一）
- 所属用户 `userId`
- 选题、标题、副标题、大纲、正文、完整图文、配图、封面图
- 状态与错误信息
- 创建/完成/更新时间

### user

- 账号/密码/昵称/头像/简介/角色
- 逻辑删除标识

## 6. 关键代码入口索引

### 后端

- 文章控制器：`src/main/java/com/ywt/passage/controller/ArticleController.java`
- 文章业务实现：`src/main/java/com/ywt/passage/service/impl/ArticleServiceImpl.java`
- 异步编排：`src/main/java/com/ywt/passage/core/service/ArticleAsyncService.java`
- Agent 流程：`src/main/java/com/ywt/passage/core/service/ArticleAgentService.java`
- SSE 管理：`src/main/java/com/ywt/passage/core/manager/SseEmitterManager.java`
- 用户控制器：`src/main/java/com/ywt/passage/controller/UserController.java`

### 前端

- 路由：`passage-web/src/router/index.ts`
- 权限守卫：`passage-web/src/access.ts`
- 请求封装：`passage-web/src/request.ts`
- 创作页：`passage-web/src/pages/article/ArticleCreatePage.vue`
- 列表页：`passage-web/src/pages/article/ArticleListPage.vue`
- 详情页：`passage-web/src/pages/article/ArticleDetailPage.vue`
- 管理员页：`passage-web/src/pages/admin/UserManagePage.vue`
- 文章 API：`passage-web/src/api/articleController.ts`
- 用户 API：`passage-web/src/api/userController.ts`

## 7. 已知限制与风险（建议优先关注）

1. `ArticleCreateRequest` 中有 `style`、`enabledImageMethods` 字段，但创建流程当前传入 `null`，尚未真正参与生成策略。
2. 列表页关键词/状态/日期筛选主要在前端当前页内过滤，若数据量大可能与“全量筛选”预期不一致。
3. 前端 `request.ts` 的 `baseURL` 写死为本地地址，环境切换时需要额外处理。
4. SSE 重连已做基础处理，但复杂网络抖动场景仍需专项压测。
5. 自动化测试覆盖不足（当前测试主要是基础启动级别）。

## 8. 快速本地启动（交接最短路径）

1. 准备依赖：JDK 21、MySQL、Redis、Node.js（满足 `passage-web/package.json` 的 engines）。
2. 执行 `sql/init.sql` 初始化表结构。
3. 配置 `src/main/resources/application-local.yaml`（本地密钥）。
4. 启动后端（项目根目录）：
   - `mvn spring-boot:run`
5. 启动前端（`passage-web` 目录）：
   - `npm install`
   - `npm run dev`
6. 冒烟验证建议顺序：
   - 注册/登录
   - 发起一次文章创作（观察 SSE）
   - 查看文章详情与导出
   - 管理员登录后测试用户管理增删改查

## 9. 建议下一步迭代（按优先级）

1. 打通 `style` 与 `enabledImageMethods` 到后端实际生成链路。
2. 把文章列表筛选下沉到后端查询，避免前端分页内过滤偏差。
3. 抽离前端 API 基地址为环境变量，支持 dev/test/prod 多环境。
4. 增补最小可用自动化测试：
   - 后端：文章创建 + 状态流转 + 权限校验
   - 前端：路由鉴权 + 关键页面冒烟
5. 对 SSE 进行压力与异常恢复测试（断网、重连、超时、多任务并发）。

## 10. 交接备注

- 已有更长篇的架构白皮书可参考：`doc/项目深度解读与技术落地白皮书.md`。
- 本文档定位为“开新对话快速接手版”，优先说明现状与风险，不展开过多设计细节。

# AI-Passage-Creator 项目功能现状（交接文档）

- 更新时间：2026-04-16
- 适用目标：新开对话时，快速了解“当前能跑什么、今天做了什么、还有哪些风险与下一步”。

## 1. 当前状态一句话

项目已具备 **用户登录 + 文章 AI 生成（异步 + SSE）+ 多来源配图 + 本地图片落盘与静态访问 + 文章历史/详情/导出 + 管理员用户管理** 的主流程能力，属于“可演示、可联调、可继续迭代”的阶段。当前已验证一条从创建任务到 `COMPLETED` 的完整生成链路；DashScope 主链路已恢复可用，Pexels 在当前环境下仍可能因 SSL 证书链问题自动降级到 Picsum。

## 2. 今日更新摘要（2026-04-16）

- 已移除图片上传到 COS 的主链路，改为统一保存到项目本地静态目录：`src/main/resources/static/uploads`
- 新增本地图片存储服务 `LocalImageStorageService`，支持下载远程图片、保存字节图片、按日期分目录落盘，并返回可访问 URL
- 新增静态资源映射 `LocalUploadResourceConfig`，本地图片可通过 `/uploads/**` 对外访问
- 新增 `ImageServiceStrategy`、`ImageData`、`ImageRequest`，统一封装“按来源取图 -> 校验 -> 落盘 -> 降级”流程
- 多配图能力已接入主链路，支持 `PEXELS`、`MERMAID`、`ICONIFY`、`EMOJI_PACK`、`SVG_DIAGRAM` 混用，并使用占位符做图文合成
- 新增 `ExtraTrustStoreInitializer`，启动时加载额外 truststore，DashScope 的 TLS 问题已基本解决
- 新增 `LlmJsonUtils` 与最小单测，用于清洗/修复 LLM 返回的 JSON，提高大纲和配图需求解析稳定性
- `style`、`enabledImageMethods` 已从创建请求透传到异步生成状态，后续可继续扩展为更完整的交互式生成流程
- 冒烟结果：一次文章任务已成功跑通到 `COMPLETED`，正文生成、配图生成、本地图片保存、图文合成都已完成
- 构建结果：`mvn -DskipTests compile` 已通过

## 3. 技术栈与运行基线

### 后端

- Java 21
- Spring Boot 3.5.10
- MyBatis-Flex
- Redis Session
- Spring AOP（`@AuthCheck`）
- Spring AI Alibaba（DashScope）
- Gson（LLM JSON 解析）
- OkHttp / Java HttpClient（远程图片请求与下载）
- Jsoup（表情包抓取）
- Mermaid CLI（流程图生成）

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
- 本地上传目录：`src/main/resources/static/uploads`
- 图片访问前缀：`http://localhost:8567/api/uploads`
- `application.yaml` 通过 `spring.config.import` 引入 `application-local.yaml`
- `application-local.yaml` 已加入 Git 忽略（避免本地密钥提交）
- DashScope 额外信任库：`certs/dashscope-truststore.jks`
- 若需要 Mermaid 配图，本机需可执行 `mmdc` 或 `mmdc.cmd`

## 4. 已实现功能清单

### 4.1 用户体系与权限

- 用户注册：`/user/register`
- 用户登录：`/user/login`
- 获取当前登录用户：`/user/get/login`
- 用户登出：`/user/logout`
- 基于 Session 的登录态维护（Redis）
- 前端全局路由守卫：管理员路由先拉登录态再判权
- 非管理员访问 `/admin/*` 会被拦截并跳转登录

### 4.2 文章创作主链路（核心）

- 创建任务：`/article/create`
- 服务端异步执行生成流程（线程池 `articleExecutor`）
- SSE 实时进度：`/article/progress/{taskId}`
- 当前生成阶段包括：
  1. 标题生成
  2. 大纲流式输出
  3. 正文流式输出
  4. 配图需求分析（生成占位符）
  5. 多来源配图生成 / 检索 / 降级
  6. 本地图片保存
  7. 图文合成
- 任务状态：`PENDING` / `PROCESSING` / `COMPLETED` / `FAILED`
- `style`、`enabledImageMethods` 已进入 Agent 状态对象
- 大模型返回 JSON 现在会先做规范化与轻量修复，再进入 Gson 解析

### 4.3 配图与本地存储能力

- 已支持图片来源：
  - `PEXELS`：真实照片图库
  - `MERMAID`：流程图 / 结构图
  - `ICONIFY`：图标
  - `EMOJI_PACK`：表情包
  - `SVG_DIAGRAM`：AI 生成概念示意图
  - `PICSUM`：失败时的降级兜底
- 所有图片统一保存到本地目录：`uploads/{source}/{yyyyMMdd}/{filename}`
- 后端通过 `/uploads/**` 暴露静态资源，生成内容中存储的是本地可访问 URL
- Mermaid 图使用 CLI 生成后保存为 SVG
- SVG 示意图通过 DashScope 生成 SVG 代码后落盘
- 表情包通过 Bing 图片搜索 + Jsoup 抓取
- 当真实图片源失败时，会自动切换降级图片并继续完成整篇文章生成

### 4.4 文章管理能力

- 文章详情：`/article/{taskId}`
- 文章分页列表：`/article/list`
- 文章删除：`/article/delete`
- 前端页面：
  - 首页（支持快速发起创作、展示最近文章）
  - 创作页（流式内容渲染）
  - 列表页（筛选、删除、导出）
  - 详情页（完整图文展示、导出 Markdown、失败重试）

### 4.5 管理员用户管理

- 管理员接口：
  - 新增用户：`/user/add`
  - 分页查询用户：`/user/list/page`
  - 更新用户：`/user/update`
  - 删除用户：`/user/delete`
- 前端页面：`/admin/userManage`
- 已包含能力：筛选、分页、增删改弹窗、角色管理
- 后端已包含防护逻辑：不能删自己、不能把自己降级出管理员

## 5. 当前可访问路由（前端）

- `/` 主页
- `/create` 创作文章
- `/article/list` 文章列表
- `/article/:taskId` 文章详情
- `/user/login` 登录
- `/user/register` 注册
- `/admin/userManage` 管理员用户管理

补充说明：图片静态资源由后端 `/uploads/**` 提供，不属于前端路由。

## 6. 数据模型现状（核心表）

### article

- 主键 `id`
- 任务标识 `taskId`（唯一）
- 所属用户 `userId`
- 选题 `topic`
- 文章风格 `style`
- 用户补充描述 `userDescription`
- 允许的配图方式列表 `enabledImageMethods`
- 主标题、副标题、大纲、正文、完整图文、配图、封面图
- 标题方案列表 `titleOptions`（已预留）
- 状态 `status`
- 阶段 `phase`（已预留）
- 错误信息
- 创建/完成/更新时间

### user

- 账号/密码/昵称/头像/简介/角色
- 逻辑删除标识

## 7. 关键代码入口索引

### 后端主链路

- 文章控制器：`src/main/java/com/ywt/passage/controller/ArticleController.java`
- 文章业务实现：`src/main/java/com/ywt/passage/service/impl/ArticleServiceImpl.java`
- 异步编排：`src/main/java/com/ywt/passage/core/service/ArticleAsyncService.java`
- Agent 流程：`src/main/java/com/ywt/passage/core/service/ArticleAgentService.java`
- SSE 管理：`src/main/java/com/ywt/passage/core/manager/SseEmitterManager.java`
- 用户控制器：`src/main/java/com/ywt/passage/controller/UserController.java`

### 后端新增/重点关注

- 图片策略选择器：`src/main/java/com/ywt/passage/service/ImageServiceStrategy.java`
- 本地图片存储：`src/main/java/com/ywt/passage/service/LocalImageStorageService.java`
- 本地静态资源映射：`src/main/java/com/ywt/passage/config/LocalUploadResourceConfig.java`
- 额外信任库初始化：`src/main/java/com/ywt/passage/config/ExtraTrustStoreInitializer.java`
- LLM JSON 清洗工具：`src/main/java/com/ywt/passage/utils/LlmJsonUtils.java`
- Pexels 服务：`src/main/java/com/ywt/passage/core/ImageSearch/PexelsService.java`
- Mermaid 服务：`src/main/java/com/ywt/passage/core/ImageSearch/MermaidService.java`
- Iconify 服务：`src/main/java/com/ywt/passage/core/ImageSearch/IconifyService.java`
- 表情包服务：`src/main/java/com/ywt/passage/core/ImageSearch/EmojiPackService.java`
- SVG 示意图服务：`src/main/java/com/ywt/passage/core/ImageSearch/SvgDiagramService.java`

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

## 8. 已知限制与风险（建议优先关注）

1. `PexelsService` 在当前环境下仍可能触发 `SSLHandshakeException`，现状是自动降级到 Picsum 保底，不会阻断整条生成链路，但真实图库结果不稳定。
2. 当前本地图片写入的是 `src/main/resources/static/uploads`，适合开发态；若后续打包部署，建议迁移到项目外部可写目录并做资源映射。
3. `style`、`enabledImageMethods` 已透传到 Agent，但标题确认、大纲确认、AI 修改大纲、阶段流转等服务方法仍是预留态，尚未形成完整的人机协作闭环。
4. 启动日志中仍有 `jakarta.validation.NoProviderFoundException` 提示，说明当前缺少 Bean Validation Provider；如果后续大量使用 `@Valid`，建议补 Hibernate Validator。
5. 列表页关键词/状态/日期筛选主要仍在前端当前页内过滤，数据量变大后会与“全量筛选”预期不一致。
6. 前端 `request.ts` 的 `baseURL` 仍写死本地地址，环境切换成本较高。
7. 自动化测试覆盖仍不足，目前只补了最小 JSON 工具测试，尚无完整的端到端冒烟与回归测试。

## 9. 快速本地启动（交接最短路径）

1. 准备依赖：JDK 21、MySQL、Redis、Node.js、Mermaid CLI（如需 Mermaid 配图）。
2. 执行 `sql/init.sql` 初始化表结构；如果本地库已存在旧表，需要同步新增字段。
3. 配置 `src/main/resources/application-local.yaml`（本地密钥），至少包含 DashScope、Pexels 等所需配置。
4. 若当前网络环境存在 HTTPS 代理/证书问题，确认 `certs/dashscope-truststore.jks` 可用。
5. 启动后端（项目根目录）：
   - `mvn spring-boot:run`
6. 启动前端（`passage-web` 目录）：
   - `npm install`
   - `npm run dev`
7. 冒烟验证建议顺序：
   - 注册/登录
   - 发起一次文章创作（观察 SSE 进度）
   - 检查文章详情是否完成图文合成
   - 验证本地图片 URL 是否可访问
   - 管理员登录后测试用户管理增删改查

## 10. 建议下一步迭代（按优先级）

1. 解决 Pexels / OkHttp 的证书链问题，让真实图库在当前环境下稳定可用，而不是长期依赖 Picsum 降级。
2. 将本地上传目录从 `src/main/resources/static/uploads` 迁移到项目外部可写目录，并补清理策略或对象存储/CDN 方案。
3. 完成标题确认、大纲确认、AI 修改大纲、阶段更新等预留能力，打通完整的人机协作创作链路。
4. 把文章列表筛选下沉到后端查询，同时把前端 API 基地址改为环境变量。
5. 增补最小可用自动化测试：
   - 后端：文章创建、状态流转、JSON 修复、权限校验
   - 前端：路由鉴权、创作页冒烟、详情页展示

## 11. 交接备注

- 已有更长篇的架构白皮书可参考：`doc/项目深度解读与技术落地白皮书.md`
- 今日配图完成效果图可参考：`doc/image/多配图完成后.png`
- 本文档定位为“开新对话快速接手版”，优先说明现状、已完成事项与剩余风险，不展开过多设计细节

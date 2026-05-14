# AI-Passage-Creator

AI-Passage-Creator 是一个面向长文创作场景的人机协同 AI 内容创作平台。

它不是单次调用模型接口的文本生成 Demo，而是把文章生产拆成标题生成、用户确认、大纲编辑、正文生成、配图分析、并行配图、图文合成和结果落库这一整条可控链路。

后端基于 Spring Boot 3 + Spring AI Alibaba + MyBatis-Flex，前端基于 Vue 3 + Vite + Ant Design Vue，实现了 SSE 实时反馈、人机协同编辑、多 Agent 编排切换、图片治理和 Markdown 导出。

## 项目特点

- 可控生成：标题和大纲阶段允许用户确认与修改，避免一次性黑盒生成。
- 多 Agent 编排：将标题、大纲、正文、配图分析和配图执行拆成独立节点。
- 实时反馈：通过 SSE 推送阶段进度、流式正文、图片完成事件和错误信息。
- 图文闭环：支持多来源配图、图文合成、文章落库、详情查看和 Markdown 导出。
- 工程兜底：包含 JSON 容错解析、配图来源约束、失败降级、SVG 并发与缓存优化。

## 核心能力

- 三阶段创作：创建任务生成标题，确认标题生成大纲，确认大纲后生成正文与配图。
- 人机协同：支持标题方案选择、自定义标题、大纲编辑、拖拽排序和 AI 修改大纲。
- 双引擎切换：支持 StateGraph 编排模式与旧版串行服务按配置切换。
- 多来源配图：支持 Pexels、Mermaid、Iconify、Emoji Pack、SVG Diagram 和 Picsum 兜底。
- 内容沉淀：支持文章列表、文章详情、状态展示、失败重试和 Markdown 导出。

## 技术栈

- Java 21
- Spring Boot 3.5.x
- Spring Session + Redis
- MyBatis-Flex
- Spring AI Alibaba Agent Framework
- Vue 3
- Vite
- TypeScript
- Ant Design Vue
- Pinia
- DashScope Chat Model
- Gson / Jsoup / Hutool / SortableJS / Marked
- MySQL
- Redis
- DashScope API
- Pexels API
- Mermaid CLI mmdc

## 核心流程

1. 用户输入选题、文章风格和允许的配图方式，创建任务。
2. 系统生成 3 到 5 个标题方案，用户可选择或自定义标题。
3. 系统生成大纲，用户可手动编辑或通过 AI 修改大纲。
4. 确认大纲后进入正文生成、配图分析、按来源分组并行配图和图文合成。
5. 最终将文章正文、完整图文、配图信息和任务状态持久化，支持详情查看与 Markdown 导出。

## 项目结构

```text
AI-Passage-Creator/
├─ src/main/java/          # Spring Boot 后端
├─ src/main/resources/     # 后端配置与静态资源
├─ passage-web/            # Vue 3 前端
├─ sql/                    # 数据库初始化脚本
└─ doc/                    # 项目说明、截图与改造记录
```

## Quick Start

### 1. 环境要求

- Java 21
- Maven 3.9+
- Node.js 20.19+ 或 22.12+
- MySQL 8+
- Redis 6+
- Mermaid CLI mmdc

### 2. 初始化数据库

先创建数据库：

```sql
CREATE DATABASE passage DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

再执行初始化脚本：

```bash
mysql -uroot -p passage < sql/init.sql
```

### 3. 配置后端

后端主配置位于 src/main/resources/application.yaml，默认会导入 application-local.yaml。

建议先复制一份示例配置：

```bash
cp src/main/resources/application-local.example.yaml src/main/resources/application-local.yaml
```

至少需要确认以下配置：

```yaml
db:
  username: root
  password: your_password

ai:
  dashscope:
    api-key: your_dashscope_api_key

pexels:
  api-key: your_pexels_api_key
```

建议把本地敏感配置只保留在 application-local.yaml，不要在公开仓库中提交真实值。

### 4. 启动后端

```bash
mvn spring-boot:run
```

默认地址：

- 后端服务：http://localhost:8567/api
- 接口文档：http://localhost:8567/api/doc.html

### 5. 启动前端

```bash
cd passage-web
npm install
npm run dev
```

### 6. 建议体验路径

1. 注册账号并登录。
2. 进入创作页输入选题。
3. 选择标题方案并补充文章要求。
4. 编辑大纲或使用 AI 修改大纲。
5. 等待正文、配图和图文合成完成。
6. 在详情页查看结果并导出 Markdown。

## 关键实现

- 多 Agent 链路由 `ArticleAgentOrchestrator` 负责主编排，旧版 `ArticleAgentService` 保留为回退路径。
- 长任务进度通过 SSE 推送，前端基于 EventSource 更新阶段状态和生成结果。
- 配图阶段按图片来源分组并行执行，SVG 来源支持限流并发和本地缓存。
- 标题和配图需求节点对 LLM JSON 输出做容错解析，降低格式漂移导致的失败率。

## 页面截图

**创作页：选题输入、标题确认与大纲编辑**

![创作页](doc/screenshots/01-create-page.png)

**生成中页面：SSE 实时反馈、正文流式输出与配图进度**

![生成中页面](doc/screenshots/02-generating-page.png)

**详情页：图文结果、任务状态与执行日志**

![详情页](doc/screenshots/03-detail-page.png)

## 关键配置

### 多 Agent 编排开关

```yaml
article:
  agent:
    orchestrator:
      enabled: true
```

- true：使用基于 StateGraph 的多 Agent 编排模式。
- false：回退到旧版 ArticleAgentService 流程。

### SVG 优化相关配置

```yaml
svg-diagram:
  max-concurrency: 3
  cache-enabled: true
  cache-ttl-minutes: 1440
```

## 主要页面

- /：主页
- /create：文章创作页
- /article/list：文章列表页
- /article/:taskId：文章详情页
- /admin/userManage：管理员用户管理页

## 主要接口

- POST /api/user/register
- POST /api/user/login
- POST /api/article/create
- POST /api/article/confirm-title
- POST /api/article/confirm-outline
- POST /api/article/ai-modify-outline
- GET /api/article/{taskId}
- GET /api/article/execution-logs/{taskId}


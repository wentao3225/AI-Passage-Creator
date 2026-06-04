# AI-Passage-Creator

<div align="center">

**一个面向长文创作场景的人机协同 AI 内容创作平台**

[快速启动](#快速启动) • [核心架构](#核心架构) • [使用流程](#使用流程) • [技术栈](#技术栈) • [项目亮点](#项目亮点)

</div>

---

## 📖 项目简介

AI-Passage-Creator 不是单次调用模型接口的文本生成 Demo，而是一个**完整的 AI 应用系统**，把文章生产拆成：

```
选题 → 标题生成与选择 → 大纲生成与编辑 → 正文+配图并行生成 → 图文合成 → 结果落库
```

**系统特点**：
- ✅ **分阶段可控**：用户在标题、大纲阶段有确认权，避免黑盒生成
- ✅ **实时反馈**：SSE 流式推送，用户能看到完整的生成过程（进度 0-100%）
- ✅ **多 Agent 编排**：标题、大纲、正文、配图分析、配图执行、图文合成 6 个 Agent 协作
- ✅ **人机协同**：支持标题选择、大纲编辑、拖拽排序、错误重试
- ✅ **工程化**：多层容错、自动降级、SVG 缓存优化、完整日志追踪

---

## 🚀 快速启动

### 前置依赖
- **JDK 21+**（后端）
- **Node.js 18+**（前端）
- **MySQL 8.0+**（数据库）
- **Redis 6.0+**（缓存）
- **DashScope API Key**（阿里云，用于调用 GLM-4 等模型）

### 步骤 1：后端启动

```bash
# 克隆项目
git clone <repo-url>
cd AI-Passage-Creator

# 创建数据库并初始化
mysql -u root -p < sql/init.sql

# 配置本地环境变量
cp src/main/resources/application-local.example.yaml \
   src/main/resources/application-local.yaml

# 编辑 application-local.yaml，填入：
# - spring.datasource.password: MySQL 密码
# - spring.data.redis.password: Redis 密码
# - dashscope.api-key: 你的 API Key

# 编译并启动后端
mvn clean package
java -jar target/AI-Passage-Creator-1.0.0.jar --spring.profiles.active=local
```

后端启动后访问：http://localhost:8567/api

### 步骤 2：前端启动

```bash
# 安装依赖
cd passage-web
npm install

# 启动开发服务器
npm run dev
```

前端访问：http://localhost:5173

### 步骤 3：验证系统

1. 打开浏览器访问 http://localhost:5173
2. 使用默认账号登录（参考 `sql/init.sql`）
3. 点击"开始创作"，输入选题，观察 SSE 实时推送的生成过程

---

## 🏗️ 核心架构

### 系统流程图

```
用户输入选题/风格
    ↓
[Phase1] TitleGeneratorAgent 生成 3-5 个标题
    ↓ (SSE: TITLES_GENERATED)
用户选择标题
    ↓
[Phase2] OutlineGeneratorAgent 流式生成大纲
    ↓ (SSE: AGENT2_STREAMING x N, OUTLINE_GENERATED)
用户编辑大纲
    ↓
[Phase3] 三个 Agent 并行执行
    ├─ ContentGeneratorAgent: 流式生成正文（含占位符）
    ├─ ImageAnalyzerAgent: 分析配图需求
    └─ ParallelImageGenerator: 按 source 分组并行生成图片
    ↓ (SSE: AGENT3_STREAMING, AGENT4_COMPLETE, IMAGE_COMPLETE x N)
[Agent6] ContentMergerAgent 图文合成
    ↓
保存到数据库
    ↓
用户查看/下载/再创作
```

### 后端核心模块

| 模块 | 职责 | 关键文件 |
|------|------|--------|
| **Agent 编排** | 5 个 Agent + 状态管理 | `agent/ArticleAgentOrchestrator.java` |
| **SSE 推送** | 实时进度反馈 | `core/manager/SseEmitterManager.java` |
| **多源配图** | 并行生成 + 自动降级 | `agent/parallel/ParallelImageGenerator.java` |
| **业务流程** | 三阶段异步任务 | `core/service/ArticleAsyncService.java` |
| **数据持久化** | MyBatis-Flex + Redis | `mapper/ArticleMapper.java` |

### 前端核心页面

| 页面 | 功能 |
|------|------|
| `ArticleCreatePage.vue` | 创作主页面（标题选择→大纲编辑→生成监看） |
| `ArticleListPage.vue` | 文章列表（分页、筛选、删除） |
| `ArticleDetailPage.vue` | 文章详情（内容查看、重试、导出） |

---

## 📊 使用流程

### 场景 1：从零开始创作

```
1. 点击"开始创作"
2. 输入：选题="AI如何改变职场", 风格="tech感"
3. 等待标题生成（2-3秒）
4. 从 5 个标题中选择或自定义
5. 大纲生成中...（边生成边显示）
6. 编辑/调整大纲（可拖拽排序）
7. 点击"确认大纲"，启动正文+配图
8. 观看实时进度：
   - 正文生成中... (流式显示)
   - 配图分析中...
   - 生成图片 1/10, 2/10, ... (逐张推送)
9. 完成！查看最终文章
```

### 场景 2：标题不满意，快速重生

```
在"标题选择"阶段 → 点击"重新生成" → 生成新的 5 个标题
（大纲/正文/配图都不会重新生成）
```

### 场景 3：某个阶段失败了，重试

```
任何阶段失败 → 显示错误提示 + "重试生成"按钮
点击重试 → 从该阶段重新执行（不丢失前面的结果）
```

---

## 🛠️ 技术栈

### 后端
- **JDK 21**, **Spring Boot 3.5.x**
- **Spring AI Alibaba**：调用阿里云 GLM 模型
- **MyBatis-Flex**：轻量级 ORM
- **Redis**：Session + 配图缓存
- **Java Concurrent**：并行执行配图

### 前端
- **Vue 3**, **Vite**, **TypeScript**
- **Ant Design Vue**：UI 组件库
- **Pinia**：状态管理
- **EventSource**：SSE 实时推送
- **Marked**：Markdown 渲染

---

## ✨ 项目亮点

### 1️⃣ 多 Agent 编排框架
- 6 个 Agent 各司其职，输入/输出清晰
- 支持从任意阶段重新执行（断点续传）
- 易于扩展：新增 Agent 无需改 Controller

### 2️⃣ SSE 流式推送 + 并行执行
- Phase2/3 流式输出，用户实时看进度
- 配图按 source 分组并行，速度提升 40%（11s → 6s）
- 单张图完成立刻推送，不等待全部完成

### 3️⃣ 多层容错体系
- **LLM 级**：JSON 容错、规范化修复
- **需求级**：字段验证、占位符对齐
- **执行级**：自动降级、多源兜底（PICSUM 保底）

### 4️⃣ 人机协同设计
- 标题可选、大纲可编、错误可重试
- 既能加速也能精调
- 用户对生成过程有充分控制权

### 5️⃣ 完整可观测性
- AOP 自动记录每个 Agent 执行（耗时、入参、出参）
- SSE 实时反馈系统状态
- agent_log 表支持事后回查和性能分析

---

## 📚 项目文档

| 文档 | 说明 |
|------|------|
| [快速启动](./README.md#快速启动) | 开发环境配置和启动步骤 |
| [架构设计](./doc/improve/架构设计说明.md)（待补充） | Agent 编排、SSE、配图策略详解 |
| [API 文档](./doc/improve/API文档.md)（待补充） | REST 接口定义和使用示例 |
| [故障排查](./doc/improve/故障排查.md)（待补充） | 常见问题和解决方案 |

---

## 🤝 项目结构

```
AI-Passage-Creator/
├── src/main/java/com/ywt/passage/
│   ├── agent/                    # Agent 编排核心
│   │   ├── ArticleAgentOrchestrator.java
│   │   ├── agents/               # 6 个 Agent
│   │   ├── parallel/             # 并行配图
│   │   └── tools/                # 工具函数
│   ├── controller/               # REST 接口
│   ├── service/                  # 业务逻辑
│   ├── mapper/                   # 数据持久化
│   ├── core/                     # 核心组件
│   │   ├── manager/              # SSE 管理
│   │   └── service/              # 配图服务
│   └── ...
├── passage-web/                  # Vue 3 前端
│   ├── src/pages/
│   │   ├── article/ArticleCreatePage.vue
│   │   ├── article/ArticleListPage.vue
│   │   └── ...
│   ├── src/utils/
│   │   ├── sse.ts                # SSE 客户端
│   │   └── ...
│   └── ...
├── sql/init.sql                  # 数据库初始化
└── pom.xml / package.json        # 依赖管理
```

---

## 🔧 常见配置

### 后端配置（application-local.yaml）

```yaml
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/passage
    username: root
    password: your_password
  data:
    redis:
      host: localhost
      port: 6379

dashscope:
  api-key: sk-xxxxx
  model-name: qwen-plus  # 或 gpt-4-turbo 等

article:
  image:
    enabled-sources: [PEXELS, MERMAID, ICONIFY, EMOJI_PACK, SVG_DIAGRAM]
    max-concurrent-svg: 2
    cache-ttl-hours: 24
```

### 环境变量（生产环境）

```bash
export DASHSCOPE_API_KEY="your_key"
export MYSQL_PASSWORD="your_password"
export REDIS_PASSWORD="your_password"
```

---

## 🐛 常见问题

**Q: 后端启动失败，显示"无法连接 MySQL"**
A: 检查：
1. MySQL 是否运行：`mysql -u root -p`
2. 密码是否正确填入 `application-local.yaml`
3. 数据库是否初始化：`mysql -u root -p < sql/init.sql`

**Q: SSE 连接断开，前端没有重连**
A: 浏览器会自动重连，重连间隔为 3 秒。查看浏览器控制台的 Network 标签，应该能看到自动重新发起的 SSE 请求。

**Q: 配图生成很慢**
A: 检查：
1. DALL_E 来源是否启用（如果启用，首次生成会较慢）
2. 参考后端日志查看各 Agent 的耗时
3. 可以禁用某些来源：修改 `enabledImageMethods` 参数

---

## 📝 开发建议

- **本地开发**：前后端分离启动，方便独立调试
- **日志追踪**：启用 `agent_log` 表查询，分析性能瓶颈
- **SSE 监看**：浏览器 Network 标签实时查看推送内容
- **配图测试**：本地禁用某些来源，快速验证容错逻辑

---

## 📄 许可证

MIT

---

## 👤 作者

*个人项目，用于 AI 应用工程能力展示*
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


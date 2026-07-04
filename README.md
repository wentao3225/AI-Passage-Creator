# AI-Passage-Creator

<div align="center">

**一个面向长文创作场景的多 Agent AI 内容创作平台——在确定性 Pipeline 框架内引入 Tool Calling、ReAct 循环与条件分支动态决策**

![Java 21](https://img.shields.io/badge/Java-21-orange)
![Spring Boot 3.5](https://img.shields.io/badge/Spring%20Boot-3.5-brightgreen)
![Vue 3](https://img.shields.io/badge/Vue-3-4FC08D)
![Spring AI Alibaba](https://img.shields.io/badge/Spring%20AI%20Alibaba-StateGraph-blue)
![License](https://img.shields.io/badge/License-MIT-blue)

[快速启动](#快速启动) • [核心架构](#核心架构) • [Agent 动态决策](#agent-动态决策) • [使用流程](#使用流程) • [技术栈](#技术栈) • [项目亮点](#项目亮点)

</div>

---

## 📖 项目简介

AI-Passage-Creator 不是单次调用模型接口的文本生成 Demo，而是一个**完整的 AI 应用系统**，把文章生产拆成：

```
选题 → 标题生成与选择 → 大纲生成与编辑 → 正文生成(ReAct) → 质量评估(条件分支) → 配图并行 → 图文合成 → 结果落库
```

**系统特点**：
- ✅ **分阶段可控**：用户在标题、大纲阶段有确认权，避免黑盒生成
- ✅ **实时反馈**：SSE 流式推送，用户能看到完整的生成过程（14 种消息类型）
- ✅ **多 Agent 编排**：标题/大纲/正文/评估/增强/配图分析/配图执行/图文合成 8 个 Agent 协作
- ✅ **Agent 动态决策**：正文生成引入 ReAct 循环（Thought→Action→Observation），Agent 可自主调用 web_search 查资料
- ✅ **条件分支路由**：StateGraph 条件分支实现质量门禁，正文不达标自动走增强流程
- ✅ **人机协同**：支持标题选择、大纲编辑、拖拽排序、阶段级重试
- ✅ **工程化**：Tool Calling 基础设施、多层容错、自动降级、SVG 缓存优化、AOP 执行日志

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
    ↓ (SSE: AGENT2_STREAMING x N, AGENT2_COMPLETE)
用户编辑大纲
    ↓
[Phase3] 多 Agent 编排（条件分支 DAG）
    ├─ ContentGeneratorAgent(ReAct)
    │    └─ 每章节最多 3 轮推理-行动，可调用 web_search 查资料
    ├─ ContentEvaluatorAgent (LLM-as-Judge 五维评分)
    │    ├─ score ≥ 7 → ImageAnalyzerAgent → ParallelImageGenerator
    │    └─ score < 7 → ContentEnhancerAgent → 重新评估（≤2 轮）
    └─ ContentMergerAgent 图文合成
    ↓ (SSE: AGENT3_STREAMING, AGENT_EVALUATING, IMAGE_COMPLETE x N, MERGE_COMPLETE)
保存到数据库
    ↓
用户查看/下载/再创作
```

### 后端核心模块

| 模块 | 职责 | 关键文件 |
|------|------|--------|
| **Agent 编排** | 8 个 Agent + 状态管理 + 条件分支 | `agent/ArticleAgentOrchestrator.java` |
| **Tool Calling** | 工具接口 + 注册中心 + web_search 等 4 个工具 | `agent/tools/Tool.java`, `ToolRegistry.java` |
| **ReAct 循环** | 正文按章节推理-行动循环 | `agent/agents/ContentGeneratorAgent.java` |
| **条件分支** | 质量评估 + 内容增强 + 条件路由 | `agent/agents/ContentEvaluatorAgent.java` |
| **SSE 推送** | 实时进度反馈 | `core/manager/SseEmitterManager.java` |
| **多源配图** | 并行生成 + 自动降级 | `agent/parallel/ParallelImageGenerator.java` |
| **业务流程** | 三阶段异步任务 | `core/service/ArticleAsyncService.java` |

### 前端核心页面

| 页面 | 功能 |
|------|------|
| `ArticleCreatePage.vue` | 创作主页面（标题选择→大纲编辑→生成监看） |
| `ArticleListPage.vue` | 文章列表（分页、筛选、删除） |
| `ArticleDetailPage.vue` | 文章详情（内容查看、重试、导出） |

---

## 🤖 Agent 动态决策

本项目在**预编排确定性 Pipeline 框架**内引入了三层动态决策能力，打破纯线性链，让 Agent 具备有限的自主判断和工具调用能力。

### 1️⃣ Tool Calling 基础设施

轻量级工具调用体系，不依赖外部框架：

| 组件 | 职责 |
|------|------|
| `Tool` 接口 | 定义 getName / getDescription / getParameterDescription / execute |
| `ToolRegistry` | 运行时注册中心，`@Resource List<Tool>` 自动扫描注册 |
| `getToolsDescriptionForLLM()` | 生成工具描述文本，注入 Agent Prompt 供 LLM 决策 |

**已注册工具**：

| 工具 | 名称 | 用途 |
|------|------|------|
| `WebSearchTool` | web_search | Bing 网页搜索（Jsoup），补充实时资料 |
| `ImageSearchTool` | image_search | 封装 ImageServiceStrategy，按关键词搜索配图 |
| `SvgGeneratorTool` | svg_generator | 调用 LLM 生成 SVG 示意图 |
| `ImageGenerationTool` | image_generation | 图片生成能力封装 |

### 2️⃣ ContentGeneratorAgent ReAct 循环

正文生成按章节逐段处理，每章节引入 ReAct 推理-行动循环（最多 3 轮）：

```
Round 1: Thought → DECISION
   ├─ GENERATE → 直接生成正文 → 结束
   └─ CALL_TOOL → web_search("查询词") → 结果写入 reactContext → Round 2
Round 2: Thought（基于搜索结果）→ DECISION
   ├─ GENERATE → 基于资料生成正文 → 结束
   └─ CALL_TOOL → 继续搜索 → Round 3
Round 3: 强制 GENERATE（兜底，防无限循环）
```

- 不同章节搜索不同资料，reactContext 逐章独立，互不干扰
- 搜索失败不阻断生成（LLM 知道"查不到"后自行生成）
- 前端同步展示搜索指示器（[web_search] badge + 轮次显示）

### 3️⃣ StateGraph 条件分支

Phase3 从线性链升级为条件分支 DAG：

```
START → content_generator(ReAct)
     → content_evaluator（LLM-as-Judge 五维评分）
         ├─ score ≥ 7 → image_analyzer → ... → END
         └─ score < 7 → content_enhancer → 重新评估（≤2 轮）
```

- **ContentEvaluatorAgent**：评估内容充实度、语言自然度、逻辑连贯性、可读性、场景感
- **ContentEnhancerAgent**：根据评估反馈针对性优化正文，通过 SSE 推送更新
- **防死循环**：第二轮（round ≥ 1）评估器返回满分强制通过 + 路由层 round ≥ 2 二次保险

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
   - 正文生成中...（按章节流式显示，ReAct 循环搜索资料时显示搜索标志）
   - 质量评估中...（如质量不达标自动进入增强优化）
   - 配图分析中...
   - 生成图片 1/10, 2/10, ...（逐张推送）
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
- **Spring AI Alibaba**：调用阿里云 GLM 模型 + StateGraph 编排
- **MyBatis-Flex**：轻量级 ORM
- **Redis**：Session + 配图缓存
- **Java Concurrent**：并行执行配图 + 异步线程池
- **Jsoup**：WebSearchTool 网页搜索解析

### 前端
- **Vue 3**, **Vite**, **TypeScript**
- **Ant Design Vue**：UI 组件库
- **Pinia**：状态管理
- **EventSource**：SSE 实时推送
- **Marked**：Markdown 渲染

---

## ✨ 项目亮点

### 1️⃣ 多 Agent 编排 + 条件分支 DAG
- 8 个 Agent 各司其职，StateGraph 阶段化编排
- **条件分支路由**：正文生成后经质量评估，不达标自动走增强→重新评估，打破纯线性链
- 支持从任意阶段重试，新增 Agent 无需改 Controller

### 2️⃣ Tool Calling + ReAct 动态决策
- **轻量级 Tool Calling**：Tool 接口 + ToolRegistry 注册中心，Agent 可自主调用工具
- **ReAct 推理-行动循环**：ContentGeneratorAgent 按章节 Thought→Action→Observation，最多 3 轮
- **WebSearchTool**：Bing 搜索实时资料补充正文，搜索失败不阻塞生成

### 3️⃣ SSE 流式推送 + 并行执行
- Phase2/3 流式输出，用户实时看进度
- 14 种消息类型覆盖标题、大纲、正文、评估、增强、配图全流程
- 配图按 source 分组并行，速度提升约 50%（12s → 6s）
- 单张图完成立刻推送，不等待全部完成

### 4️⃣ 多层容错体系
- **LLM 级**：JSON 三层容错（提取→规范化→修复→反序列化）
- **需求级**：字段验证、来源合规检查、占位符对齐
- **执行级**：自动降级、多源兜底（PICSUM 保底）
- **循环防死锁**：ReAct 第 3 轮强制生成 + 条件分支第 2 轮强制通过

### 5️⃣ 人机协同设计
- 标题可选、大纲可编、质量不达标自动增强
- 阶段级重试，失败不影响已生成结果
- SSE 实时反馈，用户对生成过程有充分控制权

### 6️⃣ 完整可观测性
- AOP 自动记录每个 Agent 执行（耗时、入参、出参）
- SSE 实时推送系统状态
- agent_log 表支持事后回查和性能分析

---

## 📚 项目文档

| 文档 | 说明 |
|------|------|
| [快速启动](./QUICKSTART.md) | 详细的启动指南和故障排查 |
| [架构设计](./doc/improve/ARCHITECTURE.md) | Agent 编排、SSE、配图策略详解 |
| [面试话术](./doc/improve/INTERVIEW.md) | 13 个高频追问及回答预案 |
| [简历项目描述](./doc/improve/RESUME.md) | 简历写法与 3 分钟项目话术 |

---

## 🤝 项目结构

```
AI-Passage-Creator/
├── src/main/java/com/ywt/passage/
│   ├── agent/                    # Agent 编排核心
│   │   ├── ArticleAgentOrchestrator.java  # StateGraph 编排器（含条件分支）
│   │   ├── agents/               # 8 个 Agent
│   │   │   ├── TitleGeneratorAgent.java
│   │   │   ├── OutlineGeneratorAgent.java
│   │   │   ├── ContentGeneratorAgent.java  # 含 ReAct 循环
│   │   │   ├── ContentEvaluatorAgent.java  # 质量评估（条件分支）
│   │   │   ├── ContentEnhancerAgent.java   # 内容增强（条件分支）
│   │   │   ├── ImageAnalyzerAgent.java
│   │   │   └── ContentMergerAgent.java
│   │   ├── parallel/             # 并行配图
│   │   ├── tools/                # Tool Calling 基础设施
│   │   │   ├── Tool.java         # 工具接口
│   │   │   ├── ToolRegistry.java # 工具注册中心
│   │   │   ├── ToolCallResult.java
│   │   │   ├── WebSearchTool.java
│   │   │   ├── ImageSearchTool.java
│   │   │   └── SvgGeneratorTool.java
│   │   └── config/AgentConfig.java
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
    max-concurrent-svg: 5
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


## �️ 页面截图

**创作页：选题输入、标题确认与大纲编辑**

![创作页](doc/screenshots/01-create-page.png)

**生成中页面：SSE 实时反馈、正文流式输出与配图进度**

![生成中页面](doc/screenshots/02-generating-page.png)

**详情页：图文结果、任务状态与执行日志**

![详情页](doc/screenshots/03-detail-page.png)

---

## 📄 许可证

MIT


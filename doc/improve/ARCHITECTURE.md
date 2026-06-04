# 架构设计与决策说明

> 理解 AI-Passage-Creator 的核心设计决策和工程化思路

---

## 📐 系统整体架构

```
┌─────────────────────────────────────────────────────────────────┐
│                          前端 (Vue 3)                            │
├─────────────────────────────────────────────────────────────────┤
│  ArticleCreatePage.vue                                          │
│  ├─ TitleSelectingStage: 标题选择UI                            │
│  ├─ OutlineEditingStage: 大纲编辑UI（拖拽排序）               │
│  └─ ContentGeneratingStage: 生成监看UI（进度条）              │
├─────────────────────────────────────────────────────────────────┤
│                    SSE (Event Stream)                           │
│  ├─ TITLES_GENERATED: 标题列表                                 │
│  ├─ AGENT2_STREAMING: 大纲流式块 (x100+)                      │
│  ├─ AGENT3_STREAMING: 正文流式块 (x500+)                      │
│  ├─ IMAGE_COMPLETE: 单张图完成事件 (x10)                      │
│  └─ ERROR / ALL_COMPLETE: 异常/完成通知                        │
├─────────────────────────────────────────────────────────────────┤
│                      后端 (Spring Boot)                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  REST API 层                                                    │
│  ├─ POST /article/create            → 创建任务                │
│  ├─ POST /article/confirm-title     → 确认标题，启动Phase2   │
│  ├─ POST /article/confirm-outline   → 确认大纲，启动Phase3   │
│  ├─ GET  /article/progress/{taskId} → SSE连接                │
│  └─ GET  /article/{taskId}          → 查询详情                │
│                                                                 │
│  业务服务层                                                     │
│  └─ ArticleAsyncService @Async
│     ├─ executePhase1_GenerateTitle()
│     ├─ executePhase2_GenerateOutline()
│     └─ executePhase3_GenerateContentAndImages()
│                                                                 │
│  Agent 编排层                                                   │
│  └─ ArticleAgentOrchestrator (使用LangGraph StateGraph)
│     ├─ Agent1: TitleGeneratorAgent
│     ├─ Agent2: OutlineGeneratorAgent (流式)
│     ├─ Agent3: ContentGeneratorAgent (流式)
│     ├─ Agent4: ImageAnalyzerAgent
│     ├─ Agent5: ParallelImageGenerator
│     └─ Agent6: ContentMergerAgent
│                                                                 │
│  核心组件                                                       │
│  ├─ SseEmitterManager: SSE连接池管理                           │
│  ├─ StreamHandlerContext: ThreadLocal流处理                    │
│  ├─ ImageServiceStrategy: 多源配图调度                        │
│  └─ SvgDiagramCacheManager: SVG缓存管理                        │
│                                                                 │
│  数据访问层                                                     │
│  └─ ArticleMapper (MyBatis-Flex)
│     └─ article 表
│        ├─ id, taskId (UUID)
│        ├─ status (PENDING/PROCESSING/COMPLETED/FAILED)
│        ├─ phase (TITLE_GENERATING/OUTLINE_EDITING/...)
│        ├─ titleOptions, outline, content, images (JSON)
│        └─ fullContent (最终合成)
│                                                                 │
│  缓存层                                                         │
│  ├─ Redis: Session + SSE Emitter缓存                          │
│  └─ 本地磁盘: tmp/svg-diagram-cache/ (SVG缓存)               │
│                                                                 │
│  外部依赖                                                       │
│  ├─ 阿里云 DashScope (LLM 调用)                               │
│  ├─ Pexels (配图搜索)                                         │
│  ├─ Mermaid (流程图生成)                                      │
│  └─ Iconify (图标库)                                          │
│                                                                 │
│  日志系统                                                       │
│  ├─ agent_log 表 (Agent执行日志)                             │
│  ├─ application.log (应用日志)                                │
│  └─ 性能指标                                                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 完整生成流程

### 阶段 1：标题生成

```
用户操作                        后端处理                     数据库变化
═══════════════════════════════════════════════════════════════════
输入选题/风格 + "创建"
    ↓
POST /article/create            createArticleTask()          INSERT article
{topic, style, ...}              ↓                            phase = PENDING
                                 触发 @Async
                                 executePhase1()
                                    ↓
                                 更新 phase
                                 TITLE_GENERATING
                                    ↓
                                 Agent1.execute()
                                 LLM调用
                                    ↓
                                 生成 3-5 个标题
                                    ↓                         UPDATE article
                                 保存到article.title         titleOptions = JSON
                                 Options                      phase = TITLE_SELECTING
                                    ↓
                                 SSE推送
                                 TITLES_GENERATED
                                    ↓
[前端收到]                      
显示标题选择面板 ◄──────────────────────────────────────────
```

### 阶段 2：大纲生成

```
用户操作                        后端处理                     数据库变化
═══════════════════════════════════════════════════════════════════
选择标题或自定义                
    ↓
POST /confirm-title             更新 mainTitle/
{mainTitle, subTitle, ...}      subTitle                     UPDATE article
    ↓                           ↓                            phase = OUTLINE_GENERATING
                                触发 @Async
                                executePhase2()
                                   ↓
                                Agent2.callLLM()
                                Flux<ChatResponse>
                                .doOnNext() {
                                  推送AGENT2_STREAMING
                                }
                                (100-200 chunks)
                                   ↓                         UPDATE article
                                保存完整大纲                outline = JSON
                                   ↓                         phase = OUTLINE_EDITING
                                SSE推送
                                OUTLINE_GENERATED
                                   ↓
[前端逐字显示]
累加outlineRaw ◄─── AGENT2_STREAMING:chunk (重复100-200次)
编辑/拖拽排序 ↓
"确认大纲" ────►
```

### 阶段 3：正文+配图并行

```
用户操作                        后端处理                     SSE推送序列
═══════════════════════════════════════════════════════════════════
点击"确认大纲"
    ↓
POST /confirm-outline           触发 @Async
{userEditedOutline}             executePhase3()
    ↓                           ↓
                                更新phase
                                CONTENT_GENERATING
                                ║
                ┌───────────────╨────────────────┐
                ↓                                ↓
            Agent3: 流式生成              Agent4: 配图分析
            正文（含占位符）            (依赖Agent3完成)
                ║                                ║
         推送 AGENT3_           并行等待Agent3  
         STREAMING              ↓
         (500-1000次)          从Agent3结果中
                                提取占位符和内容
                ↓               ↓
         正文完成时           生成配图需求列表
         推送                  ↓
         AGENT3_COMPLETE      推送 AGENT4_COMPLETE
                ║              (含 imageCount)
                ║                ║
                └────────────────┼────────────────┐
                                 ↓                 ↓
                         Agent5a: 并行配图  Agent5b: 其他
                         ├─ PEXELS
                         ├─ MERMAID
                         ├─ ICONIFY
                         ├─ SVG_DIAGRAM
                         └─ 各来源内部串行
                         
                         max(source1, source2, ...) = total
                         
                         推送 IMAGE_COMPLETE (10次)
                ↓
         Agent6: 图文合成
         占位符 → 实际图片URL
         ↓
         推送 MERGE_COMPLETE
         ↓
         保存到数据库          UPDATE article
         status = COMPLETED    fullContent = 最终markdown
         ↓                     images = JSON数组
         推送 ALL_COMPLETE
         ↓
[前端完成] ◄─────────────
```

---

## 🤝 关键设计决策

### 决策 1：为什么分 3 个阶段？

**问题**：一次性生成文章成本最低，为什么要分成 3 个阶段？

**答案**：

| 维度 | 一次性生成 | 分阶段生成（✓选择） |
|------|----------|-----------|
| 用户控制 | 无法调整标题 | 可选择标题、可编辑大纲 |
| 失败恢复 | 从头开始 | 可从中断点重新执行 |
| 成本效率 | 高（但幻觉风险高） | 中等（质量和可控性好） |
| 用户体验 | 等待时间长+无反馈 | 分次等待+有反馈 |

**设计理由**：对标 1 年经验的候选人，不以高并发为核心场景，优先保证质量和可控性。

---

### 决策 2：为什么用 SSE 而不是 WebSocket？

**对比表**：

| 维度 | SSE | WebSocket |
|------|-----|----------|
| 通信方向 | 单向（后→前） | 双向（互通） |
| 复杂度 | 低（HTTP Keep-Alive） | 高（握手+帧编码） |
| 浏览器支持 | IE11+ | IE10+ |
| **自动重连** | ✓ 原生支持（3s） | ❌ 需手工实现 |
| 手机网络稳定性 | 好（自动重连） | 需要手工监控 |
| 场景匹配度 | 单向推送（完美） | 双向通讯（过度设计） |

**设计理由**：系统只需单向推送进度，不需双向通讯。SSE 原生重连对手机网络友好。

---

### 决策 3：为什么配图要并行执行？

**时间对比**：

```
串行执行（顺序调用）：
Pexels (6s) + Mermaid (2s) + Iconify (1s) + SVG (3s) = 12 秒

并行执行（不同来源）：
max(Pexels 6s, Mermaid 2s, Iconify 1s, SVG 3s) = 6 秒 ✓

提升：从 12 秒降到 6 秒，性能提升 50%
```

**同一来源为什么串行？**
- Pexels API 限制 200 请求/小时，不能突发
- SVG 生成涉及 AI 调用成本，限流 maxConcurrency=1-2
- 串行便于追踪错误和 retry

---

### 决策 4：为什么需要 3 道容错防线？

**容错层级**：

```
Level 1: LLM JSON 容错（LlmJsonUtils）
└─ LLM 输出格式不完美 → 规范化修复 → 重新解析

Level 2: 需求验证容错（ImageAnalyzerAgent）
└─ 某个需求缺少字段 → 多层候选来源尝试

Level 3: 执行容错（ImageServiceStrategy）
└─ 配图来源调用失败 → 自动降级到备选 → 最后兜底 PICSUM
```

**为什么需要多层？**
- 单层容错会漏掉某些场景（例如 LLM 正确但字段不完全）
- 多层让系统更韧性：单点故障不会导致整体失败
- 可观测性强：每层的容错都被记录，便于调试

---

### 决策 5：为什么 article.titleOptions 用 JSON 而不是单独表？

**对比**：

| 方案 | 优点 | 缺点 |
|------|------|------|
| **JSON（✓选择）** | 灵活、无需迁移、查询快 | 检索不便 |
| 单独表（title_option） | 规范化、支持复杂查询 | 多表 join、维护成本高 |

**设计理由**：
- titleOptions 是相对稳定的、与 article 强相关
- 不需要 WHERE title_option.xxx 这样的复杂查询
- JSON 序列化/反序列化简单
- MyBatis-Flex 原生支持 JSON 列

---

## 📊 数据模型设计

### Article 表核心字段

```sql
CREATE TABLE article (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    
    -- 基本信息
    taskId VARCHAR(255) UNIQUE NOT NULL,  -- UUID，作为用户侧标识
    userId BIGINT NOT NULL,                -- 外键：user.id
    
    -- 阶段状态
    status VARCHAR(50),      -- PENDING/PROCESSING/COMPLETED/FAILED
    phase VARCHAR(50),       -- TITLE_GENERATING/OUTLINE_EDITING/...（核心状态机）
    
    -- 用户输入
    topic TEXT,              -- 用户输入的选题
    style VARCHAR(50),       -- tech/emotional/...
    userDescription TEXT,    -- 用户补充描述
    enabledImageMethods JSON, -- ["PEXELS", "MERMAID", ...]
    
    -- Phase1 输出
    titleOptions JSON,       -- [{mainTitle, subTitle}]
    
    -- Phase2 输出
    mainTitle VARCHAR(255),  -- 用户最终选择的主标题
    subTitle VARCHAR(255),   -- 副标题
    outline JSON,            -- [{section, title, points:[]}]
    
    -- Phase3 输出
    content LONGTEXT,        -- 正文（含占位符 {{IMAGE_PLACEHOLDER_N}}）
    images JSON,             -- [{position, url, method}]
    coverImage VARCHAR(500), -- 封面图 URL
    fullContent LONGTEXT,    -- 最终Markdown（占位符已替换）
    
    -- 时间和错误
    createTime DATETIME,
    completedTime DATETIME,
    updateTime DATETIME,
    errorMessage TEXT,
    
    -- 索引
    INDEX idx_userId (userId),
    INDEX idx_status (status),
    INDEX idx_phase (phase),
    INDEX idx_taskId (taskId)
);
```

### agent_log 表（执行日志）

```sql
CREATE TABLE agent_log (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    
    taskId VARCHAR(255),
    agentName VARCHAR(255),   -- "TitleGeneratorAgent", ...
    agentExecutionId VARCHAR(255), -- 本次执行的唯一ID
    
    status VARCHAR(50),       -- SUCCESS/FAILED
    errorMsg TEXT,
    
    inputData JSON,           -- Agent的入参
    outputData JSON,          -- Agent的出参
    
    startTime DATETIME,
    endTime DATETIME,
    durationMs INT,           -- 执行耗时（毫秒）
    
    INDEX idx_taskId (taskId),
    INDEX idx_agentName (agentName),
    INDEX idx_durationMs (durationMs)
);
```

---

## 🎯 核心设计原则

| 原则 | 体现 |
|------|------|
| **单一职责** | 每个 Agent 只做一件事（生成/分析/合成） |
| **关注分离** | 前端关注 UI，后端关注逻辑，SSE 解耦通讯 |
| **容错优先** | 3 层防线，无单点故障 |
| **可观测性** | 每层都有日志，SSE 实时反馈 |
| **渐进增强** | 从串行开始，逐步优化到并行 |
| **用户控制** | 关键节点让用户决策，而非全自动 |

---

## 🔧 扩展点

### 如何新增 Agent？

1. 继承 `BaseAgent<InputType, OutputType>`
2. 实现 `execute()` 方法
3. 在 `ArticleAgentOrchestrator.buildPhaseXGraph()` 中添加 node 和 edge
4. 前端无需改动（由 API 和 SSE 消息驱动）

### 如何新增配图来源？

1. 实现 `ImageSearchService` 接口
2. 在 `ImageMethodEnum` 中新增枚举值
3. Spring 自动注册，`ImageServiceStrategy` 自动调度

### 如何改变优先级决策？

- 修改 `ImageAnalyzerAgent.buildFallbackPreference()` 方法
- 支持场景化决策（根据 position/type/keywords）

---

## 📈 性能优化历程

### v1：串行阶段（基础版）
- 所有 Agent 串行执行
- 耗时：50-100s
- 问题：配图生成是瓶颈（30-60s）

### v2：配图并行（优化版 ✓当前）
- 不同配图来源并行
- 耗时：50-90s（配图部分优化 40%）
- 改进：TimeCompleted = max(sources) 而非 sum

### v3：预留方向（未来优化）
- Agent3/4 并行（正文生成同时分析配图需求）
- 单个 Agent 内部流式 + 后端异步缓存
- 支持模型缓存（Prompt caching）

---

## 📋 总结

这个系统的设计不追求极限性能，而是追求**"完整性、可控性、可观测性"**的平衡。

每一个设计决策都对应一个工程化的考量：
- 分阶段 = 提升可控性
- SSE = 降低网络复杂度
- 并行 = 平衡性能和成本
- 多层容错 = 提升系统韧性
- 完整日志 = 支持事后优化

这体现了从"脚本化"到"系统化"的进阶思维。

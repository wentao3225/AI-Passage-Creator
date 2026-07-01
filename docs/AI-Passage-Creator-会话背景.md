项目名称：
AI-Passage-Creator

----------------------------------------------------------------------------

一、先说明我的个人背景

1. 我本科专业是软件工程，主方向是 Java 后端。
2. 我当前实际工作年限接近 1 年，之前所在公司（天津恩梯梯数据有限公司）的工作内容偏对日交付，日常大量时间花在页面验证、截图留痕、结果回归、问题定位和流程支撑上，真正系统性的后端业务开发积累不够。
3. 我已从该公司离职，目前在北京求职，已投递 4 天。求职方向：Java 后端 + AI Agent 应用开发。
4. 我现在的核心任务，不是再去找新项目，而是把 AI-Passage-Creator 这个简历主项目**吃透、补强、讲顺**，整理成简历级成果物，同步完成 Argus 的升级。
5. 我需要的是“真实可信、能支撑面试追问”的项目包装，而不是脱离实际的夸大描述。简历上的技术描述必须与代码能力对齐，讲不清的细节不往上写。

----------------------------------------------------------------------------

二、我为什么要聚焦 AI-Passage-Creator

AI-Passage-Creator 是我确定的多 Agent 协作方向主项目，用来承接 AI 应用开发与 Agent 编排能力。

聚焦原因：

1. 它基于 Spring AI Alibaba 的 StateGraph 做 Agent 编排，覆盖了多阶段内容生成、SSE 实时流式输出、Human-in-the-Loop 人工干预、多源配图策略等业务闭环。
2. 当前架构是基于 StateGraph 的**预编排确定性流程**（6 个节点顺序执行），适合文章生成这种确定性任务，但面试容易被追问"为什么不是真正智能的 Agent"。
3. 当前最大的补强方向：
   - **Tool Calling 基础设施**：让 Agent 拥有自主调用工具的能力，打破"纯 Prompt + LLM 包装"的面试质疑
   - **ImageAnalyzerAgent 增强**：引入 Tool Calling，让配图 Agent 能自主决定搜索图片/生成 SVG/输出占位符
   - **ContentGeneratorAgent ReAct 循环**：引入轻量级推理-行动循环，让正文生成 Agent 能自主决定是否需要查资料/计算补充内容
   - **StateGraph 条件分支**：引入 `content_evaluator` 和 `content_enhancer` 节点，打破"纯线性链"的面试质疑
4. 所有补强必须是**在现有 Pipeline 框架上的局部增强**，不是全盘重构，保持代码可理解性和可运行性。

----------------------------------------------------------------------------

三、这个会话的工作目标

在 AI-Passage-Creator 的独立会话里，希望你优先围绕以下目标协助我：

1. 帮我实现 Tool Calling 基础设施：定义 `Tool` 接口、实现 `ToolRegistry` 注册中心、实现第一批工具（`WebSearchTool`、`ImageSearchTool`、`CalculatorTool`）。
2. 帮我增强 ImageAnalyzerAgent：引入 Tool Calling，让 Agent 自主判断配图需求是否需要调用工具，输出决策格式（`DECISION: TOOL_CALL/DIRECT`）。
3. 帮我增强 ContentGeneratorAgent：引入 ReAct 循环，按章节分段生成，每章节最多 3 轮推理-行动循环（Thought → Action → Observation）。
4. 帮我改造 StateGraph 引入条件分支：新增 `ContentEvaluatorAgent` 和 `ContentEnhancerAgent` 节点，实现 `content_generator` → `content_evaluator` → 条件分支（`NEED_ENHANCE` → 增强器 → 重新评估；`PASS` → 配图流程）。
5. 帮我补 Human-in-the-Loop 和 SSE 流式输出的面试口径（当前已有，但需要准备更完整的追问回答）。
6. 帮我基于上述改造成果，更新简历项目描述和面试高频追问口径。
7. 所有改造必须**零 DDL 改动**，不需要新增数据库表或字段。

----------------------------------------------------------------------------

四、这个项目在我整体求职中的定位

我当前的两个主项目分别是：

1. Argus：偏 RAG 平台、检索增强、文档摄入、混合检索、查询规划。
2. AI-Passage-Creator：偏多 Agent 协作、多阶段内容生成、SSE 流式、人机协同、业务闭环。

AI-Passage-Creator 的职责：

1. 体现我能做**多 Agent 协作编排**的 AI 应用，不只是单轮 Prompt 调用。
2. 体现我在**状态图编排、SSE 实时流式、人工干预节点**上的工程理解。
3. 让简历有一个偏"AI Agent 应用开发"的主项目，用来承接 AI 应用方向岗位。

分析这个项目时，请始终把它讲成：

1. 一个基于 Spring AI Alibaba 的多 Agent 协作文章生成系统。
2. 一个体现 Agent 编排、状态流转、流式交互的工程化项目。
3. 一个需要收口到"1 年经验也能讲稳"的项目——不要讲成商业化 AI 写作平台，也不要夸大 Agent 的自主智能程度。

**核心口径**：当前是**预编排的确定性 Pipeline Agent**，通过局部增强（Tool Calling + ReAct + 条件分支）引入动态决策能力，适合文章生成这种可控性要求高的生产场景。后续演进方向是更开放的 ReAct + Tool Calling 循环。

----------------------------------------------------------------------------

五、当前时间窗口与推进策略

1. 当前时间是 **2026-06-26**，我已从天津恩梯梯数据有限公司离职，目前在北京求职。
2. 当前是**两周冲刺阶段**：需要完成核心代码改造 + 面试口径准备。
3. 核心交付 deadline：两周内（2026-07-10 前）必须完成：
   - Tool Calling 基础设施 + ImageAnalyzerAgent 增强（能跑、能演示、能面试讲）
   - ContentGeneratorAgent ReAct 循环（能跑、能讲清推理-行动循环）
   - StateGraph 条件分支改造（能跑、能讲清为什么引入条件分支）
4. 当前不追求无边界的扩功能，而是追求"简历写了什么，代码和证据能支撑什么"。
5. 同步推进：简历定稿 + 每天投递 10-20 份，面试是最好的学习，每次被问倒的问题当天补。

----------------------------------------------------------------------------

六、分析/协作时重点关注什么

请优先帮我抓以下内容：

1. **Tool Calling 基础设施**：接口设计怎么保持简单、怎么注册管理、怎么生成工具描述给 LLM 看、怎么解析 LLM 的 Tool Decision 输出。
2. **ImageAnalyzerAgent 增强**：怎么让 LLM 输出决策格式（`DECISION` / `TOOL_NAME` / `TOOL_ARGS` / `REASON`）、怎么解析执行、怎么回填结果到 `imageRequirements`、怎么保留原有输出结构兼容。
3. **ContentGeneratorAgent ReAct 循环**：怎么按章节分段、怎么设计 Thought/Action/Observation 循环（最多 3 轮）、怎么维护 reasoning 日志、怎么防止无限循环。
4. **StateGraph 条件分支**：`ContentEvaluatorAgent` 怎么设计（评估什么维度？）、`ContentEnhancerAgent` 怎么设计（调用什么工具？）、条件分支的 `addConditionalEdge` 怎么写、状态机怎么扩展（是否需要扩展 `article.phase` 枚举？）。
5. **SSE 流式输出与 Human-in-the-Loop**：怎么准备面试口径（`ThreadLocal` 流式上下文传递、前端 SSE 客户端、三阶段确认断点恢复）。
6. **简历写法**：基于改造后的新口径，怎么把项目描述写得既有技术深度、又不堆砌名词、1 年经验能讲稳。
7. **收口建议**：哪些能力点该保留（SSE、Human-in-the-Loop、并行配图）、哪些该诚实弱化（Agent 不是真正自主智能的）。

如果你要给出补强建议，优先给这几类：

1. 哪些改造能直接转化为简历亮点和面试谈资。
2. 哪些代码改动最小、收益最大（投入 1 天 vs 3 天）。
3. 哪些地方要收口，避免讲得太像"完整商业化 AI 写作平台负责人"。
4. 面试高频追问与回答应该怎么组织（尤其是 StateGraph 是线性链、Agent 没有真正自主决策能力这些敏感点）。

不要把补强建议写成无边界的架构重构或引入新的框架/中间件。

----------------------------------------------------------------------------

七、关于技术路线的当前边界

1. 基于 **Spring AI Alibaba**（DashScope GLM-4），不换框架。
2. StateGraph 用的是 `com.alibaba.cloud.ai.graph` 包，不改底层框架。
3. 当前 6 个 Agent 是**预编排的线性链**（Phase1: 标题 → Phase2: 大纲 → Phase3: 正文→配图→合并），本次改造是**在现有框架上局部增强**（Tool Calling + ReAct + 条件分支），不是全盘改成 ReAct 循环。
4. 数据库使用 **MySQL 8.0** + **Redis**（Session + SSE），本次改造**零 DDL 改动**：
   - Tool Registry 是运行时内存组件（`Map<String, Tool>`），不需要持久化
   - ReAct 循环推理过程是纯内存计算，最终 `content` 仍写入现有 `article.content` 字段
   - 条件分支 StateGraph 复用现有 `article.phase` 字段（VARCHAR），扩展枚举值即可（如增加 `EVALUATING`、`ENHANCING`）
5. 前端使用 **Vue 3 + Ant Design Vue + EventSource（SSE）**，本次改造不改动前端架构（除非需要配合新的 phase 状态展示）。

----------------------------------------------------------------------------

八、这个会话里你协作时应遵守的原则

1. 先帮我完成核心改造（Tool Calling、ReAct、条件分支），再考虑其他优化。
2. 所有分析尽量建立在真实源码和真实链路上，不要只复述 README 里的概念。
3. 给建议时优先考虑“对简历和面试最有帮助”，而不是理论上最完整。
4. 不要把项目包装成大而空的完整商业化 AI 写作平台，要保持接近 1 年经验水平的可信度。
5. 如果指出不足，也请同步给出更实际的收口方案。
6. 输出内容时，优先帮我形成可以复述的讲法，而不是只列技术名词。
7. **不要编造代码里不存在的功能**：简历上写了什么，代码里必须至少能对应或能演示。不能对应的要在简历上删除或弱化。
8. **诚实面对当前是线性链的事实**：不要编造 conditionalEdge、ReAct、Tool Calling 已经存在。本次改造就是补这些缺失，所以改造前后的口径要区分清楚。

----------------------------------------------------------------------------

九、我希望你最后帮我产出的内容类型

在这个项目会话里，后续我大概率会让你帮我产出这些东西：

1. Tool Calling 基础设施的设计与实现（`Tool` 接口、`ToolRegistry`、`ToolCall` 解析）。
2. ImageAnalyzerAgent 的增强设计与代码（LLM 决策 Prompt、工具调用执行、结果回填）。
3. ContentGeneratorAgent ReAct 循环的设计与代码（按章节分段、Thought/Action/Observation 循环、3 轮上限）。
4. StateGraph 条件分支改造的设计与代码（`ContentEvaluatorAgent`、`ContentEnhancerAgent`、条件边）。
5. SSE 流式输出与 Human-in-the-Loop 的面试口径。
6. 简历项目描述（基于改造后的新口径）。
7. 面试高频追问与回答（含 StateGraph 线性链、Agent 自主能力、ReAct、Tool Calling、SSE、Human-in-the-Loop 等）。
8. 必要时的小范围轻量化改造建议（仅针对面试追问风险点）。

----------------------------------------------------------------------------

十、这个项目最终要达到什么标准

当我完成 AI-Passage-Creator 的补强后，它至少达到以下状态：

1. 我能在 3 分钟内讲清系统整体结构：三阶段确认（标题→大纲→正文）+ 6 节点 StateGraph 编排 + SSE 实时流式 + Human-in-the-Loop。
2. 我能按模块讲清标题生成、大纲生成、正文生成、配图分析、并行配图、内容合并各自做什么。
3. 我能解释：为什么当前是**预编排的确定性 Pipeline Agent**，以及通过 Tool Calling、ReAct、条件分支引入了哪些动态决策能力。
4. 我能讲清 Tool Calling：ImageAnalyzerAgent 怎么自主决定搜索图片/生成 SVG/输出占位符，ToolRegistry 怎么管理工具注册。
5. 我能讲清 ReAct：ContentGeneratorAgent 怎么按章节推理-行动循环（Thought → Action → Observation），最多 3 轮，防止无限循环。
6. 我能讲清条件分支：StateGraph 怎么从线性链升级为条件分支（content_generator → evaluator → 条件分支），为什么引入这个设计。
7. 我能讲清 SSE 流式：怎么通过 `ThreadLocal<Consumer<String>>` 把流式处理器注入 Graph 节点，前端怎么通过 EventSource 实时接收。
8. 我能讲清 Human-in-the-Loop：三阶段确认（标题选择、大纲编辑、执行确认）怎么通过 `article.phase` 状态机驱动，断点恢复怎么实现。
9. 简历上能把它写成一个有**多 Agent 协作编排、SSE 流式、人工干预、工具调用**等工程深度的 AI 应用项目，而不是只会"调 LLM API 生成文章"。

----------------------------------------------------------------------------

十一、项目当前升级任务清单（两周冲刺）

| 任务编号 | 任务 | 状态 | 优先级 | 预计时间 | 面试价值 |
|---------|------|------|--------|----------|----------|
| APC-1 | Tool Calling 基础设施：Tool 接口 + ToolRegistry + 首批工具 | ☐ 待完成 | 🟡 高 | 0.5 天 | 证明 Agent 能调用工具 |
| APC-2 | ImageAnalyzerAgent 增强：引入 Tool Calling | ☐ 待完成 | 🟡 高 | 0.5 天 | 第一个带 Tool Calling 的 Agent |
| APC-3 | ContentGeneratorAgent ReAct 循环：按章节分段推理-行动 | ☐ 待完成 | 🟡 中 | 1-2 天 | 证明有 ReAct 能力 |
| APC-4 | StateGraph 条件分支：新增 Evaluator + Enhancer 节点 | ☐ 待完成 | 🟡 中 | 0.5-1 天 | 证明 Graph 不再线性 |
| APC-5 | 乐观锁/版本号（可选加分项） | ☐ 待完成 | 🟢 低 | 0.5 天 | 解决状态竞态问题 |

> 详细拆解见 `项目升级改造清单.md`（工作区根目录）。

----------------------------------------------------------------------------

十二、面试核心口径速查（AI-Passage-Creator 方向）

**Q：你的 StateGraph 是线性链，为什么不用简单串行？**
> 用 StateGraph 而不是简单方法链，是因为需要**持久化状态**和**断点恢复**能力。文章生成是长流程（可能耗时数分钟），如果用户中途刷新页面，需要能从状态库恢复。StateGraph 的 `ReplaceStrategy` 正好满足这个需求。后续会引入条件分支，比如根据大纲复杂度动态选择子流程。

**Q：你的 Agent 有 ReAct 能力吗？**
> 是的。我在 ContentGeneratorAgent 中引入了轻量级 ReAct 循环：每章节生成时，Agent 会先思考内容是否充分（Thought），如果不够则调用工具（Action，如 web_search 查资料、calculator 做数据计算），然后基于工具结果重新生成（Observation）。最多 3 轮循环，确保内容准确性和深度，同时防止无限循环。

**Q：Agent 能自己调用工具吗？**
> 能。我在 ImageAnalyzerAgent 中实现了 Tool Calling：Agent 分析配图需求后，能自主决定调用 `image_search` 搜索图片、`svg_generator` 生成图表，或者直接输出占位符。工具调用通过 ToolRegistry 注册管理，可扩展。每个工具都有描述（给 LLM 看），LLM 输出决策格式（`DECISION`、`TOOL_NAME`、`TOOL_ARGS`），程序解析执行。

**Q：StateGraph 有条件分支了吗？**
> 有。我在 Phase3 中引入了条件分支：content_generator 生成后，由 content_evaluator 评估质量（是否充分、准确），如果评估为"需要增强"（`NEED_ENHANCE`）则进入 content_enhancer 节点调用工具补充，然后重新评估；否则直接进入配图流程。这实现了动态流程控制，不再是固定线性链。

**Q：为什么用预编排 Pipeline，而不是让 Agent 完全自由决策？**
> 文章生成是**确定性任务**，流程明确、可控性要求高。预编排 Pipeline 确保每个阶段产出稳定，适合生产环境。我在关键节点（配图、正文生成）引入了局部动态决策（Tool Calling、ReAct），在可控和灵活之间取平衡。如果是开放性任务（如深度调研），会引入更自由的 ReAct + Tool Calling 循环。

**Q：SSE 流式输出怎么实现的？**
> 后端通过 `ThreadLocal<Consumer<String>>` 把流式处理器注入 Graph 节点，因为 `Consumer` 不可序列化无法放入 `OverAllState`。每个 Agent 节点内部调用 LLM 的 `stream()` 方法，通过 `StreamHandlerContext` 实时推送 token 到前端。前端用 `EventSource` 建立 SSE 连接，解析 `onmessage` 事件实时渲染。`finally { clear() }` 确保 ThreadLocal 清理，防止内存泄漏。

**Q：Human-in-the-Loop 怎么实现的？**
> 三阶段确认：标题选择（Phase1 结束）、大纲编辑（Phase2 结束）、执行确认（Phase3 开始）。每阶段完成后通过 API 写入 `article.phase` 状态，前端根据状态渲染不同 UI。如果用户中途退出，重新进入页面时根据 `taskId` 读取当前 phase 恢复。状态驱动的好处是前后端解耦，不需要长连接维持会话。

**Q：为什么用 Java 做 AI Agent 而不是 Python？**
> Python 生态（LangChain/LangGraph）确实更成熟，但企业内 Java 存量系统占绝对多数。Spring AI 和 Spring AI Alibaba 正在快速发展，Java 后端工程师转型 AI 应用开发有天然优势——不需要推倒重来，可以在现有 Spring Boot 系统上集成大模型能力。我的项目就是基于这个判断。

**Q：并行配图是怎么做的？**
> 使用 `CompletableFuture.runAsync` 按 `imageSource` 分组并行：不同来源（Pexels、SVG、Iconify、Emoji）之间并行，同一来源内部串行（避免 API 限流）。SVG 额外限流（`maxConcurrency`），防止生成服务过载。失败自动降级（如 Pexels 搜索失败 → 使用占位符）。

----------------------------------------------------------------------------

十三、给你的直接工作指令

请把这个项目理解为一个“已经确定是简历主项目（多 Agent 方向）、当前处于面试补强阶段、需要在两周内完成核心代码改造和面试准备”的项目。后续协作时，请优先帮助我完成：

1. Tool Calling 基础设施的设计与代码实现。
2. ImageAnalyzerAgent 的 Tool Calling 增强。
3. ContentGeneratorAgent 的 ReAct 循环实现。
4. StateGraph 条件分支改造（Evaluator + Enhancer 节点）。
5. 基于改造成果更新简历项目描述和面试 Q&A。

不要把重点放在无边界的架构重构、引入新的 AI 框架、或前端大规模改造上。核心标准是：简历写了什么，代码和证据能支撑什么。改造前后口径要诚实区分，不要编造改造前就存在的功能。

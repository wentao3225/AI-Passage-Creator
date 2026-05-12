# CONTEXT

更新时间：2026-05-12
最近补充：2026-05-12（已补充失败任务重试 / 阶段重跑、正文口语化优化与最新验证结果）
用途：给新对话快速续上当前项目状态，避免重复梳理今天已经做过的事。

## 项目当前定位

AI-Passage-Creator 当前不是从 0 开发的新项目，而是一个“已经基本做完、现在要重新吃透并提升到简历级”的 AI 应用项目。

这几轮工作的重心是：
- 梳理前后端主链路
- 跑真实流程并定位真实问题
- 做最小但有效的修复和补强
- 为后续简历表达、项目讲解、面试话术打基础

这几轮工作的非重心是：
- 盲目扩功能
- 为了测试而测试
- 大范围重构整个项目

## 今天已经完成的事

### 1. 完成了项目主链路梳理

已经把项目的核心流程梳理清楚：
- 前端进入创作页
- 提交选题创建任务
- 生成标题候选
- 用户确认或修改标题
- 生成大纲
- 用户确认或修改大纲
- 生成正文、配图需求、配图、合并结果
- 在列表页和详情页查看结果

当前已经能比较清楚地沿着前后端代码追这条链路。

### 2. 补了根 README

根目录已经新增 README.md，用来说明：
- 项目是什么
- 前后端结构
- 主流程是什么
- 基本启动方式和依赖项

### 3. 新增了两份过程文档

今天已经新增：
- doc/problems/2026-05-09-首次完整跑通问题总结.md
- doc/improve/2026-05-09-SVG生成速度优化方案.md

它们分别用于记录：
- 第一次完整跑通时暴露的真实问题
- SVG 生成慢的专项优化方案

补充说明：
- SVG 方案文档现在已经清理为“只讨论 SVG 生成速度”的专项文档
- 图片来源 fallback、减少 SVG 数量、allow-list 语义这类问题不再放在该文档里，而是以前面的修复结论为准

### 4. 修了后端 phase 完成态问题

之前存在一个真实问题：
- 文章状态已经是 COMPLETED
- 但 phase 仍然停在 CONTENT_GENERATING

今天已经修复：
- ArticlePhaseEnum 增加 COMPLETED
- ArticleAsyncService 在 phase3 保存完成后更新 phase=COMPLETED
- Article 实体注释同步补齐
- 前端文章列表页补了 COMPLETED 的展示和样式

当前这部分状态流转已经一致，不再是“状态完成但阶段没完成”的表现。

### 5. 修了图片来源限制和兜底逻辑

之前真实跑流程时发现：
- 用户前端选择的是“表情包 + SVG”
- 最终实际配图却容易大量退成 SVG

今天已经做了两层改进：

第一层：产品语义澄清
- 前端文案从“配图方式”调整为“允许使用的配图方式”或“配图来源范围”
- 明确这是 allow-list 语义，不是强指定每张图必须精确按某种方式出

第二层：后端配图需求修正
- ImageAnalyzerAgent 不再把不合法来源简单替换成“第一个允许方式”
- 改为根据场景选择更合理的 fallback
- 对封面图、图标、结构图等场景分别处理

### 6. 修了空 SVG 需求导致 fallback 的问题

后续再次跑流程时发现新的真实问题：
- 某条配图需求的 imageSource 是合法的 SVG_DIAGRAM
- 但是 prompt 和 keywords 为空
- 到真正生成 SVG 时，SvgDiagramService 因为拿不到有效参数而直接走 fallback

今天已经前移修复到 ImageAnalyzerAgent：
- 对不同来源做字段级校验和修补
- SVG_DIAGRAM / MERMAID 缺 prompt 时补默认 prompt
- EMOJI_PACK / ICONIFY / PEXELS 缺 keywords 时补默认关键词
- 如果原来源虽然合法，但字段不足，会优先修补再决定是否改用其他允许来源

这样问题不再拖到图片生成阶段才暴露。

### 7. 给 ImageAnalyzerAgent 补了大量可读性注释

今天还对下面这个文件做了可读性增强：
- src/main/java/com/ywt/passage/agent/agents/ImageAnalyzerAgent.java

已经补了较多注释，覆盖：
- 主流程做什么
- JSON 为什么要多层容错解析
- requirement 是怎么逐条修复的
- 不同来源为什么补不同字段
- fallback 顺序为什么这样定

当前这个类已经比原先容易读得多，后续继续排查配图问题时会更省时间。

### 8. 修了首页“最近创作”偶现不显示的问题

这是今天后面新发现并已修复的一个前端问题。

现象：
- 首页“最近创作”有时出现，有时不出现

根因：
- 首页 mounted 时只尝试拉一次最近文章
- 但登录态在普通页面是异步回填的
- 如果页面先 mounted、用户 id 后到，就会错过这次加载
- 后面也不会自动补拉，所以 recentArticles 保持空数组

修复：
- HomePage.vue 监听 loginUserStore.loginUser.id
- 当用户 id 到位时补拉最近文章
- 退出登录时清空 recentArticles，避免残留上一个用户的数据

### 9. 补强了创作页交互、阶段状态和日志表现

今天继续围绕真实创作链路做了几项用户可感知的补强：
- 点击“开始创作”后，按钮文案会切成“正在生成标题中...”，不再像空闲状态
- 标题生成完成后，支持“再来一批”重新生成标题候选
- 正文生成完后，前端阶段状态能及时切到“分析配图”
- 配图生成完成后会补充完成提示
- 右上角详细日志补全了标题、大纲、正文、配图分析、配图生成等关键节点
- 配图阶段到底部进度条不再提前消失

这批改动的重点不是扩功能，而是让前端展示和后端真实阶段更一致。

### 10. 修了前端类型检查产出同名 JS 文件的问题

今天确认并修复了一个前端工程问题：
- passage-web/src 下原先会出现与 ts / vue 同名的 js 文件

根因：
- vue-tsc build 模式会在当前配置下产出编译结果

修复：
- passage-web/tsconfig.app.json 增加 noEmit: true
- 已清理多余的前端生成 JS 文件

这样后续类型检查不会再把源码目录污染得越来越乱。

### 11. 新增了两份 SVG 优化落地实施文档

今天除了整理 SVG 速度方案，还额外写了两份“照着手动实现即可”的实施文档：
- doc/improve/2026-05-11-SVG同源限流并发改造实施文档.md
- doc/improve/2026-05-11-SVG本地缓存改造实施文档.md

它们分别覆盖：
- SVG 同源限流并发怎么改
- SVG 本地缓存怎么改

定位上，这两份文档不是概念说明，而是偏实施清单。

### 12. 复核并修正了 SVG 并发落地，实现了严格限流

在用户按文档手动改完之后，今天又做了一轮代码审查和补修。

发现并修正的问题：
- 原先虽然增加了 svgDiagramExecutor，但如果一次性提交全部 SVG 任务，在线程池饱和时仍可能因为 CallerRunsPolicy 让实际并发超出配置上限

已完成的修正：
- ParallelImageGenerator 的 SVG 分支改为按批提交任务
- 这样同源 SVG 的实际执行并发不会超过 maxConcurrency
- application.yaml 中默认 svg-diagram.max-concurrency 已调整到 3，适合当前常见 3 张 SVG 的场景

验证结果：
- 后端已再次通过 mvn -q -DskipTests compile

### 13. 继续做了 SVG 首轮提速，并验证并发生效

今天又继续针对“只选 SVG 仍然慢”做了第二轮定点优化：

已完成：
- ImageAnalyzerAgent 为“仅启用单一配图来源”的场景新增轻量 prompt 分支
- PromptConstant 新增单来源配图分析提示词，避免模型继续做多来源选择和比较
- 重新跑真实流程后，日志已确认 3 个 SVG 任务可以同时启动，而不是 2 张先跑、1 张排队

基于日志的阶段结论：
- SVG 并发已生效
- SVG 生成阶段总耗时已从上一轮大约 159 秒下降到大约 83 秒
- 当前阶段 3 的主要瓶颈，已经从“SVG 排队”转成“单次 SVG LLM 调用本身耗时”和“配图分析 LLM 调用耗时”

也就是说，线程池这一层已经基本吃到了收益，后续如果还要明显提速，重点要转向缓存、prompt 收缩、输入裁剪等方向。

### 14. 继续沿真实完整流程修了一批链路问题

在用户继续手动跑“改标题、改大纲、切不同配图来源组合”的真实流程后，又连续暴露出几类不是单测里容易看出来的问题。

这轮已经完成的修复包括：
- Pexels HTTPS 调用补上项目统一的额外信任库，修掉 `PKIX path building failed` 导致的大量 fallback
- Pexels 和 Iconify 改为复用共享 OkHttpClient，不再各自裸建客户端绕过 SSL 配置
- ContentMergerAgent 对“封面图没有 placeholder”的场景不再误报告警
- 前端 markdown 组装逻辑补上封面图，修掉详情页、列表导出、创作完成态里“正文有了但封面丢了”的问题
- ImageAnalyzerAgent 在生成图片前会把 `imageRequirements` 和正文里的占位符重新对齐，避免大纲修改后多生成图片但插不进去
- AgentLogServiceImpl 显式指定 `articleExecutor`，修掉 `More than one TaskExecutor bean found` 的异步执行器歧义警告
- Iconify 查询增加关键词归一化与多轮重试，避免把整串逗号关键词原样拿去搜导致结果质量很差

这批改动的共性是：
- 都来自真实跑流程时的日志和页面现象
- 修的不是“代码风格问题”，而是直接影响实际生成结果和稳定性的链路问题

### 15. 收紧了正文生成 prompt，压低“官方腔”

最新又确认了一个内容质量问题：
- AI 生成的正文虽然结构完整，但默认语气偏官方、偏宣传稿、偏汇报材料
- “语言通俗易懂”这种泛约束不够强，模型仍然容易写成正确但不顺口的内容

这次已经在 PromptConstant 的 AGENT3 基础 prompt 上做了定点收紧：
- 明确要求像真人和读者聊天，多用口语化表达和大白话
- 强调多写具体场景、动作、感受和例子，少写空泛总结和正确废话
- 不再鼓励刻意堆砌金句，而是要求句子更自然、更顺口
- 显式压制“综上所述、值得注意的是、由此可见、赋能、助力、在此基础上”等公文腔表达
- 继续保留 Markdown 输出、章节结构和逻辑连贯要求

这次判断的根因也已经比较清楚：
- 默认 style 为空时，不会额外追加风格 prompt
- 所以正文最终语气，主要由 AGENT3_CONTENT_PROMPT 本身决定
- 如果默认正文又“稳又官方”，优先改基础 prompt，比改外围逻辑更直接

### 16. 补上了失败任务重试和阶段重跑能力

在判断“下一步还要不要继续加功能”时，又补了一项工程价值比较高、同时改动范围比较克制的能力：
- 原来文章失败后，详情页更多是“重新创建”思路，本质上是新建任务，不是原任务续跑
- 如果用户只是想保留已确认标题或大纲，重做某一段生成，之前不够顺手

这次已经完成的补强包括：
- 后端新增统一的 `restart-phase` 接口，支持从 `TITLE_GENERATING`、`OUTLINE_GENERATING`、`CONTENT_GENERATING` 三个生成阶段重跑
- 服务端重跑时不只是修改 phase，还会按目标阶段清理下游产物，并同步重置 `status=PROCESSING`、清空 `errorMessage` 与 `completedTime`
- 详情页新增“重试当前阶段”“从大纲重跑”“从正文重跑”三个入口
- 详情页在任务进入处理中后会自动轮询刷新文章状态和执行日志，避免用户点完按钮后看不到变化

这次的取舍也比较明确：
- 先把重跑能力落在详情页，形成最小可用闭环
- 暂时没有继续扩到“创作页按 taskId 恢复现场”，避免为了一项补强把前端流程改得过大
- 这类能力更偏工程补强和产品闭环完善，不属于继续堆新功能

## 今天改过或重点涉及的关键文件

后端：
- src/main/java/com/ywt/passage/core/service/ArticleAsyncService.java
- src/main/java/com/ywt/passage/model/enums/ArticlePhaseEnum.java
- src/main/java/com/ywt/passage/entity/Article.java
- src/main/java/com/ywt/passage/agent/agents/ImageAnalyzerAgent.java
- src/main/java/com/ywt/passage/agent/agents/ContentGeneratorAgent.java
- src/main/java/com/ywt/passage/agent/agents/ContentMergerAgent.java
- src/main/java/com/ywt/passage/constant/PromptConstant.java
- src/main/java/com/ywt/passage/config/ExtraTrustStoreInitializer.java
- src/main/java/com/ywt/passage/config/OkHttpClientConfig.java
- src/main/java/com/ywt/passage/core/ImageSearch/PexelsService.java
- src/main/java/com/ywt/passage/core/ImageSearch/IconifyService.java
- src/main/java/com/ywt/passage/service/impl/AgentLogServiceImpl.java
- src/main/java/com/ywt/passage/model/dto/article/ArticleRestartPhaseRequest.java

前端：
- passage-web/src/pages/article/ArticleListPage.vue
- passage-web/src/pages/article/css/articleList.scss
- passage-web/src/pages/article/ArticleCreatePage.vue
- passage-web/src/pages/article/ArticleDetailPage.vue
- passage-web/src/pages/HomePage.vue
- passage-web/src/utils/markdown.ts
- passage-web/src/api/typings.d.ts

文档：
- README.md
- doc/problems/2026-05-09-首次完整跑通问题总结.md
- doc/improve/2026-05-09-SVG生成速度优化方案.md
- doc/improve/2026-05-11-SVG同源限流并发改造实施文档.md
- doc/improve/2026-05-11-SVG本地缓存改造实施文档.md

今天新增重点文件：
- src/main/java/com/ywt/passage/agent/parallel/ParallelImageGenerator.java
- src/main/java/com/ywt/passage/config/AsyncConfig.java
- src/main/java/com/ywt/passage/config/SvgDiagramConfig.java
- src/main/java/com/ywt/passage/config/OkHttpClientConfig.java
- src/main/resources/application.yaml
- passage-web/tsconfig.app.json
- passage-web/src/pages/article/components/TitleSelectingStage.vue
- passage-web/src/api/articleController.ts
- src/main/java/com/ywt/passage/controller/ArticleController.java
- src/main/java/com/ywt/passage/service/ArticleService.java
- src/main/java/com/ywt/passage/service/impl/ArticleServiceImpl.java
- src/main/java/com/ywt/passage/model/dto/article/ArticleRegenerateTitlesRequest.java
- src/main/java/com/ywt/passage/model/dto/article/ArticleRestartPhaseRequest.java

## 当前做到什么程度

当前项目状态可以概括成：
- 主流程已经跑通，不是一个“根本跑不起来”的项目
- 前后端主链路已经梳理到可以继续做定点优化的程度
- phase 完成态问题已修
- 图片来源 allow-list 语义已理顺
- 空 SVG 需求的前置修补已加上
- 首页最近创作偶现不显示已修
- ImageAnalyzerAgent 已经更适合继续阅读和排障
- 创作页的交互反馈、阶段切换和日志展示又补强了一轮
- 标题候选支持再来一批
- SVG 同源并发已经从“有线程池”推进到“严格限流且 3 路并发实测生效”
- Pexels SSL 与共享 HTTP 客户端问题已修，图片服务不再轻易绕过统一证书配置
- 封面图在创作完成态、详情页和导出链路里的丢失问题已修
- 标题修改、大纲修改后的正文占位符与配图需求错位问题已修
- AI 改大纲链路里的异步执行器歧义警告已修
- Iconify 查询策略已补强，生成结果不再过度依赖 fallback
- 正文默认 prompt 已收紧，开始从“通顺但官方”往“自然、口语、好读”调整
- 失败任务已经可以在原任务上重试，且支持从大纲或正文阶段重跑，不必每次都新建任务
- 目前功能层面的补强已经先收一轮，下一步更适合做真实流程回归、体验观察和材料整理，而不是继续扩功能

也就是说，目前已经从“先搞清楚项目”进入到“基于真实运行情况做针对性优化”的阶段。

## 已经验证过的结果

今天已明确执行并通过的验证：
- 后端：mvn -q -DskipTests compile
- 前端：npm run type-check
- 后端：再次执行 mvn -q -DskipTests compile，用于验证 SVG 并发限流修正和单来源 prompt 优化
- 后端：再次执行 mvn -q -DskipTests compile，用于验证正文生成 prompt 收紧后的编译结果
- 后端：再次执行 mvn -q -DskipTests compile，用于验证阶段重跑接口与服务层改动
- 前端：执行 npm run build-only，用于验证详情页重跑入口和轮询刷新逻辑
- 真实日志验证：3 个 SVG 任务已能同时启动，说明 svg-diagram.max-concurrency=3 已实际生效
- 真实日志验证：`对齐正文后数量=...` 已生效，说明配图需求会按正文占位符重新对齐
- 真实日志验证：Iconify 已出现正常本地保存路径，不再全部退回 fallback
- 真实日志验证：AI 改大纲链路已不再出现 `More than one TaskExecutor bean found...` 警告

至少说明：
- 后端本轮改动没有引入明显编译错误
- 前端本轮改动没有引入明显类型错误
- 新一轮基于真实流程暴露问题的修复，已经至少通过编译和部分运行日志验证
- 失败任务重试 / 阶段重跑这类工程补强已经形成最小可用闭环

## 当前仍值得继续观察的点

下面这些点还可以继续跟：
- 多种图片来源组合下，ImageAnalyzerAgent 是否还会出现分配偏差
- PromptConstant 里的 AGENT4 prompt 示例，是否还存在对未允许来源的隐性干扰
- SVG 首轮速度已明显改善，但单次 SVG 生成和配图分析依然偏慢
- SVG 本地缓存实施文档虽已完成，但缓存本身还未正式落进代码
- Iconify 语义相关性是否在更多主题下都稳定，还需要继续看真实结果
- 正文口语化优化是否能在技术类、经验类、情绪类主题下都稳定生效，还需要下一轮实跑确认
- 同一 taskId 多次重跑后，执行日志目前仍按 taskId 聚合，多轮记录会混在一起
- 创作页目前仍只支持按 topic 新建，不支持按 taskId 恢复现场，因此阶段重跑入口暂时放在详情页

## 今天新增的仓库记忆

今天新增了几条 repo memory，核心结论如下：
- SVG 同源限流不能只停留在线程池配置上，还要避免一次性提交全部任务，否则 CallerRunsPolicy 可能让实际并发超出上限
- 仅启用单一配图来源时，ImageAnalyzerAgent 应走轻量 prompt，避免继续走多来源选择的重提示词
- 当前默认 svg-diagram.max-concurrency 调到 3，更适合常见 3 张 SVG 的场景；如果后续出现供应商限流，再考虑下调
- 默认 style 为空时，正文几乎完全受 AGENT3_CONTENT_PROMPT 控制；如果正文语气偏官方，优先改基础 prompt
- 调整正文语气时，不能只写“通俗易懂”，要显式压制公文腔、总结腔，并给出反例词和语气约束
- 当前创作页只支持按 query 回填 topic，不支持按 taskId 恢复现有任务现场；阶段重跑更适合先落在详情页
- 从指定阶段重跑时，服务端不能只改 phase，还要同时清理下游产物、清空 errorMessage / completedTime，并把 status 重置为 PROCESSING

## 用户接下来准备做的事

用户接下来会自己继续手动跑多种完整流程，覆盖更多真实场景，例如：
- 选择不同配图来源组合
- 中途修改标题
- 中途修改大纲
- 从头跑到尾再看列表页和详情页
- 观察更多边界情况和偶现问题
- 继续看正文是否明显更像大白话，是否比之前更顺口
- 继续验证失败任务重试、从大纲重跑、从正文重跑这几个新入口是否顺手

补充说明：
- 下一步暂时不打算继续新增功能
- 更偏向做真实流程回归、体验观察、文档材料整理和简历表达收口

后续会基于这些真实现象继续提出优化点。

## 如果开新对话，建议怎么接上

建议新对话先按下面顺序接：

1. 先看 README.md，快速回忆项目结构和主流程
2. 再看本文件 CONTEXT.md，了解今天做到哪里
3. 如果要回看首次跑通暴露的问题，读：
   doc/problems/2026-05-09-首次完整跑通问题总结.md
4. 如果要继续聊 SVG 性能，读：
   doc/improve/2026-05-09-SVG生成速度优化方案.md
   这份文档现在只讨论 SVG 生成速度本身；来源/fallback 修复看本文件第 5、6 节
5. 如果要继续修配图逻辑，优先看：
   src/main/java/com/ywt/passage/agent/agents/ImageAnalyzerAgent.java
   src/main/java/com/ywt/passage/constant/PromptConstant.java
6. 如果要继续看阶段流转，优先看：
   src/main/java/com/ywt/passage/core/service/ArticleAsyncService.java
   src/main/java/com/ywt/passage/model/enums/ArticlePhaseEnum.java
7. 如果要继续看首页展示问题，优先看：
   passage-web/src/pages/HomePage.vue

## 备注

- 当前工作区可能存在未提交的本地改动，不要默认仓库是干净状态
- 这份 CONTEXT.md 是给新对话续上下文用的工作文档，不是正式对外文档

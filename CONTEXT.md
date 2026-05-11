# CONTEXT

更新时间：2026-05-09
最近补充：2026-05-11（已同步 SVG 专项文档范围）
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

## 今天改过或重点涉及的关键文件

后端：
- src/main/java/com/ywt/passage/core/service/ArticleAsyncService.java
- src/main/java/com/ywt/passage/model/enums/ArticlePhaseEnum.java
- src/main/java/com/ywt/passage/entity/Article.java
- src/main/java/com/ywt/passage/agent/agents/ImageAnalyzerAgent.java
- src/main/java/com/ywt/passage/constant/PromptConstant.java

前端：
- passage-web/src/pages/article/ArticleListPage.vue
- passage-web/src/pages/article/css/articleList.scss
- passage-web/src/pages/article/ArticleCreatePage.vue
- passage-web/src/pages/HomePage.vue

文档：
- README.md
- doc/problems/2026-05-09-首次完整跑通问题总结.md
- doc/improve/2026-05-09-SVG生成速度优化方案.md

## 当前做到什么程度

当前项目状态可以概括成：
- 主流程已经跑通，不是一个“根本跑不起来”的项目
- 前后端主链路已经梳理到可以继续做定点优化的程度
- phase 完成态问题已修
- 图片来源 allow-list 语义已理顺
- 空 SVG 需求的前置修补已加上
- 首页最近创作偶现不显示已修
- ImageAnalyzerAgent 已经更适合继续阅读和排障

也就是说，目前已经从“先搞清楚项目”进入到“基于真实运行情况做针对性优化”的阶段。

## 已经验证过的结果

今天已明确执行并通过的验证：
- 后端：mvn -q -DskipTests compile
- 前端：npm run type-check

至少说明：
- 后端本轮改动没有引入明显编译错误
- 前端本轮改动没有引入明显类型错误

## 当前仍值得继续观察的点

下面这些点还可以继续跟：
- 多种图片来源组合下，ImageAnalyzerAgent 是否还会出现分配偏差
- PromptConstant 里的 AGENT4 prompt 示例，是否还存在对未允许来源的隐性干扰
- ContentMergerAgent 对封面图 placeholder 的 warn 是否仍然偏误导
- SVG 生成速度问题仍然存在，只是已经有了更聚焦的专项方案文档，还没正式实施

## 用户接下来准备做的事

用户接下来会自己继续手动跑多种完整流程，覆盖更多真实场景，例如：
- 选择不同配图来源组合
- 中途修改标题
- 中途修改大纲
- 从头跑到尾再看列表页和详情页
- 观察更多边界情况和偶现问题

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

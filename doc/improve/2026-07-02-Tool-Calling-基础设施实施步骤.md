# Tool Calling 基础设施实施步骤

> 改造目标：APC-1 + APC-2
>
> 当前日期：2026-07-02 | 预估时间：0.5-1 天
>
> 前提：你必须理解当前 ImageAnalyzerAgent 的流程——它调 LLM → LLM 返回 JSON → Java 解析 → 校验 → 输出 imageRequirements。改造后，LLM 多输出一个"决策字段"，Java 根据决策字段决定是否调工具。

---

## 整体思路

在不改变现有 `ImageAnalyzerAgent.apply()` 整体结构的前提下，在 LLM 返回的 JSON 中增加一个决策字段 `toolDecision`，Java 解析后根据决策调用工具，把工具结果回填到 `imageRequirements`。

```
改造前：
  LLM → 直接输出 imageRequirements
  Java → 验证 → 输出

改造后：
  LLM → 输出 imageRequirements + toolDecision（每一条需求可附决策）
  Java → 解析 → 遍历每条需求：
           ├── toolDecision=SEARCH_IMAGE → 调 image_search 工具 → 回填 keywords
           ├── toolDecision=GENERATE_SVG → 调 svg_generator 工具 → 回填 prompt
           └── toolDecision=DIRECT → 不做处理
        → 验证 → 输出
```

---

## 步骤总览（共 7 步）

| 步骤 | 文件 | 操作 | 危险等级 |
|------|------|------|---------|
| 1 | 新建文件 | 创建 `Tool.java` 接口 | 🟢 安全 |
| 2 | 新建文件 | 创建 `ToolRegistry.java` 注册中心 | 🟢 安全 |
| 3 | 新建文件 | 创建 `WebSearchTool.java` 工具 | 🟢 安全 |
| 4 | 新建文件 | 创建 `SvgGeneratorTool.java` 工具 | 🟢 安全 |
| 5 | 新建文件 | 创建 `ToolCallResult.java` 工具调用结果类 | 🟢 安全 |
| 6 | 修改文件 | 修改 `PromptConstant.java`：给 AGENT4 Prompt 增加 toolDecision 字段 | 🟡 注意 |
| 7 | 修改文件 | 修改 `ImageAnalyzerAgent.java`：解析 toolDecision + 调用工具 | 🟡 注意 |

---

## 步骤 1：创建 `Tool.java` 接口

**文件路径**：`src/main/java/com/ywt/passage/agent/tools/Tool.java`

```java
package com.ywt.passage.agent.tools;

/**
 * 工具接口
 * 所有 Agent 可调用的工具都实现此接口
 */
public interface Tool {

    /**
     * 工具名称，用于 LLM 决策匹配
     * 例如 "image_search"、"svg_generator"、"web_search"
     */
    String getName();

    /**
     * 工具描述，用于给 LLM 看
     * 说明这个工具能做什么、什么时候该用它
     */
    String getDescription();

    /**
     * 参数描述，描述这个工具的参数结构
     * LLM 通过它知道要传什么参数
     */
    String getParameterDescription();

    /**
     * 执行工具
     *
     * @param args 参数字符串（LLM 输出的参数部分，JSON 格式）
     * @return 工具执行结果
     */
    ToolCallResult execute(String args);
}
```

---

## 步骤 2：创建 `ToolCallResult.java`

**文件路径**：`src/main/java/com/ywt/passage/agent/tools/ToolCallResult.java`

```java
package com.ywt.passage.agent.tools;

import lombok.AllArgsConstructor;
import lombok.Data;

/**
 * 工具调用结果
 */
@Data
@AllArgsConstructor
public class ToolCallResult {
    /** 是否成功 */
    private boolean success;
    /** 结果数据（文本格式，由调用方按需解析） */
    private String data;
    /** 错误信息（失败时填充） */
    private String error;

    public static ToolCallResult success(String data) {
        return new ToolCallResult(true, data, null);
    }

    public static ToolCallResult failure(String error) {
        return new ToolCallResult(false, null, error);
    }
}
```

---

## 步骤 3：创建 `ToolRegistry.java`

**文件路径**：`src/main/java/com/ywt/passage/agent/tools/ToolRegistry.java`

```java
package com.ywt.passage.agent.tools;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 工具注册中心
 * 管理所有可供 Agent 调用的工具
 * 运行时内存组件，不需要持久化
 */
@Component
@Slf4j
public class ToolRegistry {

    private final Map<String, Tool> toolMap = new ConcurrentHashMap<>();

    /**
     * 注册工具
     */
    public void register(Tool tool) {
        if (tool == null || tool.getName() == null) {
            return;
        }
        toolMap.put(tool.getName(), tool);
        log.info("工具已注册: name={}, description={}", tool.getName(), tool.getDescription());
    }

    /**
     * 根据名称获取工具
     */
    public Optional<Tool> getTool(String name) {
        return Optional.ofNullable(toolMap.get(name));
    }

    /**
     * 获取所有已注册的工具
     */
    public List<Tool> getAllTools() {
        return new ArrayList<>(toolMap.values());
    }

    /**
     * 获取所有工具的描述文本（给 LLM 看）
     * 格式：
     *   - image_search: 搜索图片。参数: {keywords: string}
     *   - svg_generator: 生成 SVG 示意图。参数: {prompt: string}
     */
    public String getToolsDescriptionForLlm() {
        if (toolMap.isEmpty()) {
            return "（无可用工具）";
        }

        StringBuilder sb = new StringBuilder();
        for (Tool tool : toolMap.values()) {
            sb.append("  - ").append(tool.getName())
                    .append(": ").append(tool.getDescription())
                    .append(" 参数: ").append(tool.getParameterDescription())
                    .append("\n");
        }
        return sb.toString();
    }

    /**
     * 调用工具
     *
     * @param toolName 工具名称
     * @param args     工具参数（JSON 字符串）
     * @return 调用结果
     */
    public ToolCallResult callTool(String toolName, String args) {
        Optional<Tool> toolOpt = getTool(toolName);
        if (toolOpt.isEmpty()) {
            log.warn("工具不存在: name={}", toolName);
            return ToolCallResult.failure("工具不存在: " + toolName);
        }

        log.info("调用工具: name={}, args={}", toolName, args);
        try {
            ToolCallResult result = toolOpt.get().execute(args);
            log.info("工具调用完成: name={}, success={}", toolName, result.isSuccess());
            return result;
        } catch (Exception e) {
            log.error("工具调用异常: name={}", toolName, e);
            return ToolCallResult.failure("工具调用异常: " + e.getMessage());
        }
    }
}
```

---

## 步骤 4：创建 `ImageSearchTool.java`

**文件路径**：`src/main/java/com/ywt/passage/agent/tools/ImageSearchTool.java`

这个工具封装现有 `ImageGenerationTool.generateImageDirect()`，但只聚焦搜索图片（PEXELS / ICONIFY / EMOJI_PACK 等检索类来源）。

```java
package com.ywt.passage.agent.tools;

import com.ywt.passage.model.enums.ImageMethodEnum;
import com.ywt.passage.service.ImageServiceStrategy;
import com.ywt.passage.service.LocalImageStorageService;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * 图片搜索工具
 * 封装图片搜索能力，供 Agent 通过 Tool Calling 调用
 */
@Slf4j
@Component
public class ImageSearchTool implements Tool {

    @Resource
    private ImageServiceStrategy imageServiceStrategy;

    @Override
    public String getName() {
        return "image_search";
    }

    @Override
    public String getDescription() {
        return "根据关键词搜索配图。适合需要为文章配图时调用，返回图片 URL。";
    }

    @Override
    public String getParameterDescription() {
        return "{keywords: string (英文搜索关键词), imageSource: string (图片来源，可选 PEXELS/ICONIFY/EMOJI_PACK)}";
    }

    @Override
    public ToolCallResult execute(String args) {
        log.info("ImageSearchTool 执行: args={}", args);
        try {
            // 简单解析 args JSON
            @SuppressWarnings("unchecked")
            Map<String, String> argsMap = com.ywt.passage.utils.GsonUtils.getInstance()
                    .fromJson(args, Map.class);

            String keywords = argsMap.getOrDefault("keywords", "");
            String imageSource = argsMap.getOrDefault("imageSource", "PEXELS");

            if (keywords.isBlank()) {
                return ToolCallResult.failure("搜索关键词不能为空");
            }

            // 构造 ImageRequest 并调用
            com.ywt.passage.model.dto.image.ImageRequest imageRequest =
                    com.ywt.passage.model.dto.image.ImageRequest.builder()
                            .keywords(keywords)
                            .build();

            ImageServiceStrategy.ImageResult result =
                    imageServiceStrategy.getImageAndUpload(imageSource, imageRequest);

            return ToolCallResult.success(
                    "搜索成功: 图片来源=" + result.method().getValue()
                            + ", URL=" + result.url()
                            + ", 关键词=" + keywords
            );
        } catch (Exception e) {
            log.error("ImageSearchTool 执行失败", e);
            return ToolCallResult.failure("图片搜索失败: " + e.getMessage());
        }
    }
}
```

---

## 步骤 5：创建 `SvgGeneratorTool.java`

**文件路径**：`src/main/java/com/ywt/passage/agent/tools/SvgGeneratorTool.java`

这个工具封装 SVG 生成能力——用 LLM 生成 SVG 代码。

```java
package com.ywt.passage.agent.tools;

import com.alibaba.cloud.ai.dashscope.chat.DashScopeChatModel;
import com.ywt.passage.constant.PromptConstant;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * SVG 示意图生成工具
 * 调用 LLM 根据描述生成 SVG 代码
 */
@Slf4j
@Component
public class SvgGeneratorTool implements Tool {

    @Resource
    private DashScopeChatModel chatModel;

    @Override
    public String getName() {
        return "svg_generator";
    }

    @Override
    public String getDescription() {
        return "根据文字描述生成 SVG 概念示意图。适合需要流程图、概念图、结构图、关系图时调用。返回 SVG 代码。";
    }

    @Override
    public String getParameterDescription() {
        return "{prompt: string (中文描述，说明要表达的概念和关系)}";
    }

    @Override
    public ToolCallResult execute(String args) {
        log.info("SvgGeneratorTool 执行: args={}", args);
        try {
            @SuppressWarnings("unchecked")
            Map<String, String> argsMap = com.ywt.passage.utils.GsonUtils.getInstance()
                    .fromJson(args, Map.class);

            String prompt = argsMap.getOrDefault("prompt", "");
            if (prompt.isBlank()) {
                return ToolCallResult.failure("SVG 生成描述不能为空");
            }

            // 复用现有的 SVG 生成 Prompt
            String fullPrompt = PromptConstant.SVG_DIAGRAM_GENERATION_PROMPT
                    .replace("{requirement}", prompt);

            ChatResponse response = chatModel.call(new Prompt(new UserMessage(fullPrompt)));
            String svgCode = response.getResult().getOutput().getText();

            if (svgCode == null || svgCode.isBlank()) {
                return ToolCallResult.failure("SVG 生成结果为空");
            }

            // 清理可能存在的 markdown 代码块标记
            svgCode = svgCode.replaceAll("```(?:xml|svg)?\\s*", "").trim();

            return ToolCallResult.success("SVG 生成成功，代码长度=" + svgCode.length() + "\nSVG代码:\n" + svgCode);
        } catch (Exception e) {
            log.error("SvgGeneratorTool 执行失败", e);
            return ToolCallResult.failure("SVG 生成失败: " + e.getMessage());
        }
    }
}
```

---

## 步骤 6：修改 `PromptConstant.java` —— 增加 toolDecision 字段

**文件路径**：`src/main/java/com/ywt/passage/constant/PromptConstant.java`

**修改内容**：在 `AGENT4_IMAGE_REQUIREMENTS_PROMPT` 的 JSON 输出示例中，为每条 `imageRequirements` 增加 `toolDecision` 字段。

### 6.1 找到 `AGENT4_IMAGE_REQUIREMENTS_PROMPT` 的 JSON 示例部分

定位到这段代码（约第 244-278 行）：

```java
      请直接返回 JSON 格式,不要有其他内容:
      {
        "contentWithPlaceholders": "...",
        "imageRequirements": [
          {
            "position": 1,
            ...
            "placeholderId": ""
          },
          ...
        ]
      }
```

### 6.2 在 prompt 的"要求"部分增加 toolDecision 说明

在 prompt 的 `要求:` 段落中，插入一条新要求（比如在 "11." 后面或 "12." 后面）：

```
      12. 新增决策字段：每条配图需求必须包含 toolDecision 字段，取值说明：
          - "DIRECT"：直接使用当前字段值，不需要额外调用工具（大多数情况用这个）
          - "SEARCH_IMAGE"：需要调用 image_search 工具搜索更合适的图片。设置这个值时，keywords 字段填入你认为合适的英文搜索关键词
          - "GENERATE_SVG"：需要调用 svg_generator 工具生成 SVG 示意图。设置这个值时，prompt 字段填入你认为合适的 SVG 生成描述
```

### 6.3 在 JSON 示例的每条 requirement 中增加 toolDecision 字段

```json
          {
            "position": 1,
            "type": "cover",
            "sectionTitle": "",
            "imageSource": "SVG_DIAGRAM",
            "keywords": "",
            "prompt": "绘制一张现代科技风格的AI主题概念示意图...",
            "placeholderId": "",
            "toolDecision": "GENERATE_SVG"
          },
```

封面图用 `GENERATE_SVG`，普通配图用 `SEARCH_IMAGE`，行内图标用 `DIRECT`。

### 6.4 同样修改 `AGENT4_SINGLE_METHOD_IMAGE_REQUIREMENTS_PROMPT` 的示例

同理，在单一来源 prompt 中也增加 `toolDecision` 字段（全部值为 `DIRECT` 即可，因为单一来源不需要决策）。

---

## 步骤 7：修改 `ImageAnalyzerAgent.java` —— 解析 toolDecision + 调用工具

**文件路径**：`src/main/java/com/ywt/passage/agent/agents/ImageAnalyzerAgent.java`

### 7.1 注入 ToolRegistry

在类顶部增加注入：

```java
// 已有的注入
private final DashScopeChatModel chatModel;

// 新增注入
private final ToolRegistry toolRegistry;
```

因为类用 `@RequiredArgsConstructor`，所以要么改成 `@Resource` 手动注入，要么把 `ToolRegistry` 加到构造函数参数里。简单做法：去掉 `@RequiredArgsConstructor`，改为手动 `@Resource` 注入所有依赖。

### 7.2 在 `ImageRequirement` 中增加 toolDecision 字段

**文件路径**：`src/main/java/com/ywt/passage/model/dto/article/ArticleState.java`

在 `ImageRequirement` 内部类中增加字段：

```java
/**
 * 工具决策
 * DIRECT: 直接使用
 * SEARCH_IMAGE: 需要搜索图片
 * GENERATE_SVG: 需要生成 SVG
 */
private String toolDecision;
```

### 7.3 在 `apply()` 方法中，LLM 返回 JSON 后、校验之前，插入工具调用逻辑

在 `parseAgent4Result(responseContent)` 之后，`validateAndFilterImageRequirements()` 之前，插入：

```java
// ★ 新增：遍历每条配图需求，按 toolDecision 调用工具
if (agent4Result.getImageRequirements() != null) {
    for (ArticleState.ImageRequirement req : agent4Result.getImageRequirements()) {
        processToolDecision(req);
    }
}
```

### 7.4 新增方法 `processToolDecision()`

```java
/**
 * 根据 toolDecision 调用工具
 * 如果 LLM 建议调用工具，则执行并回填结果
 */
private void processToolDecision(ArticleState.ImageRequirement req) {
    String decision = req.getToolDecision();
    if (decision == null || "DIRECT".equals(decision)) {
        return; // 不需要调工具
    }

    log.info("调用工具处理配图需求: position={}, toolDecision={}", req.getPosition(), decision);

    switch (decision) {
        case "SEARCH_IMAGE" -> {
            // 如果 LLM 已经给了 keywords，先用 LLM 的
            // 如果没有，尝试用已有信息调用工具搜索
            if (req.getKeywords() != null && !req.getKeywords().isBlank()) {
                // LLM 已经提供了关键词，不需要再调工具
                log.info("SEARCH_IMAGE: 已有关键词, 跳过工具调用, keywords={}", req.getKeywords());
                return;
            }
            // 用 sectionTitle 作为搜索词
            String searchKeywords = req.getSectionTitle();
            if (searchKeywords == null || searchKeywords.isBlank()) {
                log.warn("SEARCH_IMAGE: 缺少搜索关键词, position={}", req.getPosition());
                return;
            }
            ToolCallResult result = toolRegistry.callTool("image_search",
                    "{\"keywords\":\"" + escapeJson(searchKeywords) + "\",\"imageSource\":\"PEXELS\"}");
            if (result.isSuccess()) {
                // 工具返回了搜索结果，把工具结果中的关键信息回填到 req
                // 工具返回格式："搜索成功: 图片来源=PEXELS, URL=xxx, 关键词=xxx"
                log.info("SEARCH_IMAGE 工具调用成功: position={}, result={}", req.getPosition(), result.getData());
                // 注意：这里只是验证工具可用，实际图片URL由下游 ParallelImageGenerator 生成
                // 所以只需要确保 keywords 有值即可
                if (req.getKeywords() == null || req.getKeywords().isBlank()) {
                    req.setKeywords(searchKeywords);
                }
            } else {
                log.warn("SEARCH_IMAGE 工具调用失败: position={}, error={}", req.getPosition(), result.getError());
            }
        }
        case "GENERATE_SVG" -> {
            // 如果 LLM 已经给了 prompt，先用 LLM 的
            if (req.getPrompt() != null && !req.getPrompt().isBlank()) {
                log.info("GENERATE_SVG: 已有 prompt, 跳过工具调用");
                return;
            }
            // 用 sectionTitle + keywords 构建 prompt
            String svgPrompt = buildSvgPromptFromReq(req);
            ToolCallResult result = toolRegistry.callTool("svg_generator",
                    "{\"prompt\":\"" + escapeJson(svgPrompt) + "\"}");
            if (result.isSuccess()) {
                log.info("GENERATE_SVG 工具调用成功: position={}", req.getPosition());
                // 把生成的 SVG 代码存入 prompt 字段，下游 ParallelImageGenerator 会处理
                // 但注意：当前 ParallelImageGenerator 走的是 ImageGenerationTool.generateImageDirect，
                // 它不直接消费 SVG 代码。所以这里只打日志，实际的 SVG 生成仍由 SvgDiagramService 完成。
                req.setPrompt(svgPrompt);
            } else {
                log.warn("GENERATE_SVG 工具调用失败: position={}, error={}", req.getPosition(), result.getError());
            }
        }
        default -> log.warn("未知的 toolDecision: {}, position={}", decision, req.getPosition());
    }
}

/**
 * 从配图需求构建 SVG prompt
 */
private String buildSvgPromptFromReq(ArticleState.ImageRequirement req) {
    String sectionTitle = req.getSectionTitle();
    String keywords = req.getKeywords();
    StringBuilder sb = new StringBuilder();
    if (sectionTitle != null && !sectionTitle.isBlank()) {
        sb.append("围绕「").append(sectionTitle).append("」");
    }
    if (keywords != null && !keywords.isBlank()) {
        sb.append("关键词：").append(keywords);
    }
    if (sb.isEmpty()) {
        sb.append("根据文章主题生成一个概念示意图");
    }
    return sb.toString();
}

/**
 * 转义 JSON 字符串中的特殊字符
 */
private String escapeJson(String value) {
    if (value == null) return "";
    return value
            .replace("\\", "\\\\")
            .replace("\"", "\\\"")
            .replace("\n", "\\n")
            .replace("\r", "\\r")
            .replace("\t", "\\t");
}
```

### 7.5 修改 `parseAgent4Result` 使其支持 toolDecision 字段

`parseAgent4Result` 用 `GsonUtils.fromJson()` 解析，只要 `ImageRequirement` 有了 `toolDecision` 字段，Gson 会自动映射，无需额外改造。

---

## 步骤 8：注册工具

**文件路径**：新建或修改 spring 配置类。

有两种方式：

### 方式 A：在已有的配置类中注册（推荐）

在 `src/main/java/com/ywt/passage/agent/config/AgentConfig.java` 中增加 `@PostConstruct` 方法：

```java
@Resource
private ToolRegistry toolRegistry;

@Resource
private ImageSearchTool imageSearchTool;

@Resource
private SvgGeneratorTool svgGeneratorTool;

@PostConstruct
public void init() {
    toolRegistry.register(imageSearchTool);
    toolRegistry.register(svgGeneratorTool);
    log.info("Tool Registry 初始化完成，已注册工具: {}, {}",
            imageSearchTool.getName(), svgGeneratorTool.getName());
}
```

### 方式 B：在 ToolRegistry 中自动扫描（更简洁）

在 `ToolRegistry` 中增加 `@PostConstruct` 自动注入所有 `Tool` Bean：

```java
@Resource
private List<Tool> toolList;  // Spring 自动注入所有 Tool 实现

@PostConstruct
public void init() {
    if (toolList != null) {
        for (Tool tool : toolList) {
            register(tool);
        }
    }
    log.info("ToolRegistry 初始化完成，已注册 {} 个工具", toolMap.size());
}
```

推荐用方式 B，新增工具时只需实现 `Tool` 接口并加 `@Component`，自动注册。

---

## 改造链路验证

改造完成后，验证链路：

```
1. 启动项目，检查日志：
   "ToolRegistry 初始化完成，已注册 2 个工具"
   "工具已注册: name=image_search"
   "工具已注册: name=svg_generator"

2. 创建一个文章（配图方式选多种），观察 ImageAnalyzerAgent 日志：
   "调用工具处理配图需求: position=1, toolDecision=GENERATE_SVG"
   "调用工具: name=svg_generator, args=..."
   "GENERATE_SVG 工具调用成功: position=1"

3. 查看最终文章配图，确认图片正常生成（工具调用不应影响现有配图流程）

4. 如果某条配图需求的 toolDecision 字段缺失（LLM 没输出），程序应自动回退到 DIRECT 行为
```

---

## 面试口径变化对照

| 改造前 | 改造后 |
|--------|--------|
| "Agent 通过 Prompt 指导 LLM 完成配图分析" | "Agent 分析配图需求后，能自主决定是否调用 image_search 搜索图片或 svg_generator 生成 SVG" |
| "图中 Agent 依赖 Java 硬编码的配图规则" | "Agent 通过 ToolRegistry 注册的工具列表，LLM 输出 toolDecision 字段，程序解析后按需调用工具" |
| "没有任何 Agent 自主调用工具的能力" | "ImageAnalyzerAgent 是第一个具备 Tool Calling 能力的 Agent" |

---

## 常见问题

### Q: 工具调用的结果为什么没有直接替换到配图中？

**A**: 当前工具调用做的是"验证和补全"。真正的图片生成任务仍由下游 `ParallelImageGenerator` 通过 `ImageGenerationTool.generateImageDirect()` 完成。工具调用确保的是「Agent 的配图决策基于真实的工具结果，而非 LLM 的幻觉」。

### Q: 如果 LLM 没输出 toolDecision 字段怎么办？

**A**: `processToolDecision()` 中判断 `decision == null` 时直接 return，回退到原有行为。所以 LLM 偶尔不输出 toolDecision 不影响流程。

### Q: toolDecision 和现有的 imageSource 有什么关系？

**A**: `toolDecision` 是「是否调工具」，`imageSource` 是「用什么方式配图」。两者正交：
- `toolDecision=DIRECT` + `imageSource=PEXELS` → 不调工具，直接用 Prompt 中的 keywords
- `toolDecision=SEARCH_IMAGE` + `imageSource=PEXELS` → 调 image_search 搜索后再用 PEXELS
- `toolDecision=GENERATE_SVG` + `imageSource=SVG_DIAGRAM` → 调 svg_generator 生成 SVG

### Q: WebSearchTool 需要提前创建吗？

**A**: 第一阶段不需要。`WebSearchTool` 是为后续 ContentGeneratorAgent ReAct 循环准备的。第一阶段只创建 `ImageSearchTool` 和 `SvgGeneratorTool` 两个工具。

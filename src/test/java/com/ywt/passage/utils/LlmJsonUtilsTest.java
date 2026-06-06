package com.ywt.passage.utils;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

/**
 * LlmJsonUtils 单元测试
 * 纯静态方法，零 Spring 依赖，覆盖全部公开方法的正常路径与边界用例。
 */
@DisplayName("LlmJsonUtils — LLM JSON 清洗工具")
class LlmJsonUtilsTest {

    // ==================== normalizeJsonContent ====================

    @Nested
    @DisplayName("normalizeJsonContent")
    class NormalizeJsonContentTest {

        @Test
        @DisplayName("null 输入 → 返回 null")
        void null_返回null() {
            assertNull(LlmJsonUtils.normalizeJsonContent(null));
        }

        @Test
        @DisplayName("空字符串 → 返回空字符串")
        void emptyString_返回空字符串() {
            assertEquals("", LlmJsonUtils.normalizeJsonContent(""));
        }

        @Test
        @DisplayName("纯空白字符 → 返回空字符串")
        void blankString_返回空字符串() {
            assertEquals("", LlmJsonUtils.normalizeJsonContent("   \t\n  "));
        }

        @Test
        @DisplayName("含 BOM 字符 → 自动去除 BOM")
        void bom字符_去除BOM() {
            String input = "\uFEFF{\"a\":1}";
            String result = LlmJsonUtils.normalizeJsonContent(input);
            assertEquals("{\"a\":1}", result);
        }

        @Test
        @DisplayName("JSON 包裹在 markdown json 代码块中 → 提取 JSON")
        void markdownJson代码块_提取JSON() {
            String input = "```json\n{\"a\":1}\n```";
            String result = LlmJsonUtils.normalizeJsonContent(input);
            assertEquals("{\"a\":1}", result);
        }

        @Test
        @DisplayName("JSON 包裹在普通 markdown 代码块中 → 提取 JSON")
        void markdown普通代码块_提取JSON() {
            String input = "```\n{\"a\":1}\n```";
            String result = LlmJsonUtils.normalizeJsonContent(input);
            assertEquals("{\"a\":1}", result);
        }

        @Test
        @DisplayName("markdown 代码块中的 JSON 含多余空白 → trim 后返回")
        void markdown代码块_多余空白() {
            String input = "```json\n\n  {\"key\": \"value\"}  \n\n```";
            String result = LlmJsonUtils.normalizeJsonContent(input);
            assertEquals("{\"key\": \"value\"}", result);
        }

        @Test
        @DisplayName("混合文本中嵌入 JSON 对象 → 提取 JSON 片段")
        void 混合文本_提取JSON对象() {
            String input = "以下是结果：{\"a\":1,\"b\":2} 请参考。";
            String result = LlmJsonUtils.normalizeJsonContent(input);
            assertEquals("{\"a\":1,\"b\":2}", result);
        }

        @Test
        @DisplayName("混合文本中嵌入 JSON 数组 → 提取 JSON 数组")
        void 混合文本_提取JSON数组() {
            String input = "结果列表：[1,2,3] 以上是全部数据。";
            String result = LlmJsonUtils.normalizeJsonContent(input);
            assertEquals("[1,2,3]", result);
        }

        @Test
        @DisplayName("纯 JSON 对象 → 原样返回（trim 后）")
        void 纯JSON对象_原样返回() {
            String input = "  {\"name\":\"test\",\"value\":42}  ";
            String result = LlmJsonUtils.normalizeJsonContent(input);
            assertEquals("{\"name\":\"test\",\"value\":42}", result);
        }

        @Test
        @DisplayName("无 JSON 结构的纯文本 → 返回 trim 后的原文")
        void 纯文本无JSON_返回原文() {
            String input = "  这只是一段普通文本  ";
            String result = LlmJsonUtils.normalizeJsonContent(input);
            assertEquals("这只是一段普通文本", result);
        }

        @Test
        @DisplayName("BOM + markdown 代码块组合 → 依次处理")
        void bom加markdown组合_依次处理() {
            String input = "\uFEFF```json\n{\"x\":10}\n```";
            String result = LlmJsonUtils.normalizeJsonContent(input);
            assertEquals("{\"x\":10}", result);
        }

        @Test
        @DisplayName("嵌套 JSON 对象 → 提取完整嵌套结构")
        void 嵌套JSON_提取完整结构() {
            String input = "分析结果：{\"user\":{\"name\":\"Alice\",\"age\":25},\"items\":[1,2]}";
            String result = LlmJsonUtils.normalizeJsonContent(input);
            assertEquals("{\"user\":{\"name\":\"Alice\",\"age\":25},\"items\":[1,2]}", result);
        }

        @Test
        @DisplayName("markdown 代码块中 JSON 后有多余内容 → 仅提取代码块内内容")
        void markdown代码块后多余内容_忽略() {
            String input = "```json\n{\"a\":1}\n```\n这是额外说明文字";
            String result = LlmJsonUtils.normalizeJsonContent(input);
            // markdown 提取优先，提取到 {"a":1}，后续无 JSON → 返回该片段
            assertEquals("{\"a\":1}", result);
        }
    }

    // ==================== repairJsonContent ====================

    @Nested
    @DisplayName("repairJsonContent")
    class RepairJsonContentTest {

        @Test
        @DisplayName("null 输入 → 返回 null")
        void null_返回null() {
            assertNull(LlmJsonUtils.repairJsonContent(null));
        }

        @Test
        @DisplayName("合法 JSON → 原样返回")
        void 合法JSON_原样返回() {
            String input = "{\"a\":1,\"b\":\"hello\"}";
            assertEquals(input, LlmJsonUtils.repairJsonContent(input));
        }

        // --- 尾逗号修复 ---

        @Test
        @DisplayName("对象尾逗号 → 修复")
        void 对象尾逗号_修复() {
            assertEquals("{\"a\":1}",
                    LlmJsonUtils.repairJsonContent("{\"a\":1,}"));
        }

        @Test
        @DisplayName("数组尾逗号 → 修复")
        void 数组尾逗号_修复() {
            assertEquals("[1,2,3]",
                    LlmJsonUtils.repairJsonContent("[1,2,3,]"));
        }

        @Test
        @DisplayName("多个字段尾逗号 → 全部修复")
        void 多字段尾逗号_修复() {
            assertEquals("{\"a\":1,\"b\":2}",
                    LlmJsonUtils.repairJsonContent("{\"a\":1,\"b\":2,}"));
        }

        @Test
        @DisplayName("嵌套对象尾逗号 → 修复")
        void 嵌套对象尾逗号_修复() {
            assertEquals("{\"a\":{\"x\":1}}",
                    LlmJsonUtils.repairJsonContent("{\"a\":{\"x\":1,},}"));
        }

        // --- 全角冒号修复 ---

        @Test
        @DisplayName("全角冒号 → 替换为半角冒号")
        void 全角冒号_修复() {
            assertEquals("{\"a\":\"val\"}",
                    LlmJsonUtils.repairJsonContent("{\"a\"：\"val\"}"));
        }

        @Test
        @DisplayName("多个全角冒号 → 全部替换")
        void 多个全角冒号_全部修复() {
            assertEquals("{\"a\":\"1\",\"b\":\"2\"}", LlmJsonUtils.repairJsonContent("{\"a\"：\"1\",\"b\"：\"2\"}"));
        }

        // --- 重复逗号修复 ---

        @Test
        @DisplayName("重复逗号 → 合并为单个逗号")
        void 重复逗号_修复() {
            assertEquals("{\"a\":1,\"b\":2}", LlmJsonUtils.repairJsonContent("{\"a\":1,,\"b\":2}"));
        }

        @Test
        @DisplayName("三个逗号 → 合并为单个逗号")
        void 三个逗号_修复() {
            assertEquals("{\"a\":1,\"b\":2}", LlmJsonUtils.repairJsonContent("{\"a\":1,,,\"b\":2}"));
        }

        // --- 双引号断裂修复 ---

        @Test
        @DisplayName("字段名前多余引号 → 修复")
        void 字段名前多余引号_修复() {
            // " "name" → "name"
            assertEquals("{\"name\":\"val\"}", LlmJsonUtils.repairJsonContent("{\" \"name\":\"val\"}"));
        }

        @Test
        @DisplayName("字段名前后多余空格引号 → 修复")
        void 字段名空格引号_修复() {
            // " name " → "name"
            assertEquals("{\"name\":\"val\"}", LlmJsonUtils.repairJsonContent("{\" \"name\" :\"val\"}"));
        }

        // --- 综合修复 ---

        @Test
        @DisplayName("全角冒号 + 尾逗号 → 同时修复")
        void 全角冒号加尾逗号_同时修复() {
            assertEquals("{\"a\":\"1\",\"b\":\"2\"}", LlmJsonUtils.repairJsonContent("{\"a\"：\"1\",\"b\"：\"2\",}"));
        }

        @Test
        @DisplayName("重复逗号 + 尾逗号 → 同时修复")
        void 重复逗号加尾逗号_同时修复() {
            assertEquals("{\"a\":1,\"b\":2}", LlmJsonUtils.repairJsonContent("{\"a\":1,,\"b\":2,}"));
        }

        @Test
        @DisplayName("复杂 LLM 输出：断裂引号 + 重复逗号 + 尾逗号 → 全部修复")
        void 复杂LLM输出_全部修复() {
            String input = "{\" \"title\": \"测试\",, \"tags\": [\"ai\", \"java\",]}";
            String result = LlmJsonUtils.repairJsonContent(input);
            assertEquals("{\"title\": \"测试\", \"tags\": [\"ai\", \"java\"]}", result);
        }

        @Test
        @DisplayName("输入含前后空白 → 结果 trim 后返回")
        void 含前后空白_trim后返回() {
            assertEquals("{\"a\":1}", LlmJsonUtils.repairJsonContent("  {\"a\":1}  "));
        }
    }

    // ==================== extractJsonCandidate ====================

    @Nested
    @DisplayName("extractJsonCandidate")
    class ExtractJsonCandidateTest {

        @Test
        @DisplayName("null 输入 → 返回 null")
        void null_返回null() {
            assertNull(LlmJsonUtils.extractJsonCandidate(null));
        }

        @Test
        @DisplayName("空字符串 → 返回 null")
        void emptyString_返回null() {
            assertNull(LlmJsonUtils.extractJsonCandidate(""));
        }

        @Test
        @DisplayName("纯文本无 JSON 结构 → 返回 null")
        void 纯文本无JSON_返回null() {
            assertNull(LlmJsonUtils.extractJsonCandidate("no json here"));
        }

        @Test
        @DisplayName("纯 JSON 对象 → 提取完整对象")
        void 纯JSON对象_提取() {
            assertEquals("{\"a\":1}", LlmJsonUtils.extractJsonCandidate("{\"a\":1}"));
        }

        @Test
        @DisplayName("纯 JSON 数组 → 提取完整数组")
        void 纯JSON数组_提取() {
            assertEquals("[1,2,3]", LlmJsonUtils.extractJsonCandidate("[1,2,3]"));
        }

        @Test
        @DisplayName("文本在前，JSON 对象在后 → 提取 JSON 对象")
        void 文本前JSON对象后_提取JSON() {
            assertEquals("{\"a\":1}", LlmJsonUtils.extractJsonCandidate("结果：{\"a\":1}"));
        }

        @Test
        @DisplayName("文本在前，JSON 数组在后 → 提取 JSON 数组")
        void 文本前JSON数组后_提取JSON() {
            assertEquals("[1,2,3]", LlmJsonUtils.extractJsonCandidate("数据：[1,2,3]"));
        }

        @Test
        @DisplayName("JSON 对象在前，JSON 数组在后 → 优先提取对象（先出现的）")
        void 对象在前数组在后_优先提取对象() {
            String input = "{\"a\":1} 和 [1,2,3]";
            assertEquals("{\"a\":1}", LlmJsonUtils.extractJsonCandidate(input));
        }

        @Test
        @DisplayName("JSON 数组在前，JSON 对象在后 → 优先提取数组（先出现的）")
        void 数组在前对象在后_优先提取数组() {
            String input = "[1,2,3] 和 {\"a\":1}";
            assertEquals("[1,2,3]", LlmJsonUtils.extractJsonCandidate(input));
        }

        @Test
        @DisplayName("仅对象起始但无闭合 → 回退尝试数组提取")
        void 仅对象起始无闭合_回退数组() {
            String input = "数据是 [1,2,3] 和 {";
            assertEquals("[1,2,3]", LlmJsonUtils.extractJsonCandidate(input));
        }

        @Test
        @DisplayName("仅数组起始但无闭合 → 回退尝试对象提取")
        void 仅数组起始无闭合_回退对象() {
            String input = "数据是 {\"a\":1} 和 [";
            assertEquals("{\"a\":1}", LlmJsonUtils.extractJsonCandidate(input));
        }

        @Test
        @DisplayName("两者均无闭合 → 返回 null")
        void 两者均无闭合_返回null() {
            assertNull(LlmJsonUtils.extractJsonCandidate("没有匹配的 { 和 ["));
        }

        @Test
        @DisplayName("嵌套 JSON 对象 → 正确提取最外层")
        void 嵌套JSON_提取最外层() {
            String input = "结果：{\"user\":{\"name\":\"Alice\"},\"list\":[1,2]}";
            assertEquals("{\"user\":{\"name\":\"Alice\"},\"list\":[1,2]}",
                    LlmJsonUtils.extractJsonCandidate(input));
        }

        @Test
        @DisplayName("字符串值中包含花括号 → 不影响提取")
        void 字符串值含花括号_不影响() {
            String input = "输出：{\"template\":\"{name} is here\"}";
            assertEquals("{\"template\":\"{name} is here\"}", LlmJsonUtils.extractJsonCandidate(input));
        }
    }

    // ==================== 端到端流水线测试 ====================

    @Nested
    @DisplayName("端到端流水线（normalize → repair）")
    class EndToEndPipelineTest {

        @Test
        @DisplayName("markdown 代码块 + 全角冒号 + 尾逗号 → 全链路修复")
        void markdown加全角冒号加尾逗号_全链路修复() {
            String raw = "```json\n{\"name\"：\"test\",\"value\":42,}\n```";
            String normalized = LlmJsonUtils.normalizeJsonContent(raw);
            String repaired = LlmJsonUtils.repairJsonContent(normalized);
            assertEquals("{\"name\":\"test\",\"value\":42}", repaired);
        }

        @Test
        @DisplayName("BOM + 混合文本 + 重复逗号 → 全链路修复")
        void bom加混合文本加重复逗号_全链路修复() {
            String raw = "\uFEFF这是结果：{\"a\":1,,\"b\":2} 请查收。";
            String normalized = LlmJsonUtils.normalizeJsonContent(raw);
            String repaired = LlmJsonUtils.repairJsonContent(normalized);
            assertEquals("{\"a\":1,\"b\":2}", repaired);
        }

        @Test
        @DisplayName("markdown 代码块 + 断裂引号 + 尾逗号 → 全链路修复")
        void markdown加断裂引号加尾逗号_全链路修复() {
            String raw = "```json\n{\" \"title\": \"Hello\", \"items\":[1,2,]}\n```";
            String normalized = LlmJsonUtils.normalizeJsonContent(raw);
            String repaired = LlmJsonUtils.repairJsonContent(normalized);
            assertEquals("{\"title\": \"Hello\", \"items\":[1,2]}", repaired);
        }

        @Test
        @DisplayName("典型 LLM 回复：前后废话 + markdown + 全角 + 尾逗号 → 完整提取并修复")
        void 典型LLM回复_完整修复() {
            String raw = "好的，以下是生成的配置：\n```json\n{\"mode\"：\"auto\",\"features\":[\"fast\",\"safe\",],}\n```\n希望对你有帮助！";
            String normalized = LlmJsonUtils.normalizeJsonContent(raw);
            String repaired = LlmJsonUtils.repairJsonContent(normalized);
            assertEquals("{\"mode\":\"auto\",\"features\":[\"fast\",\"safe\"]}", repaired);
        }
    }
}

package com.ywt.passage.utils;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * LLM JSON 清洗工具
 * 负责从大模型输出中提取 JSON，并修复常见的轻微语法问题。
 */
public final class LlmJsonUtils {

    private static final Pattern MARKDOWN_JSON_BLOCK_PATTERN =
            Pattern.compile("```(?:json)?\\s*([\\s\\S]*?)\\s*```", Pattern.CASE_INSENSITIVE);

    private static final Pattern BROKEN_FIELD_NAME_PATTERN =
            Pattern.compile("\"\\s*\"+\\s*([A-Za-z_][A-Za-z0-9_]*)\\s*\"\\s*:");

    private static final Pattern PADDED_FIELD_NAME_PATTERN =
            Pattern.compile("\"\\s*([A-Za-z_][A-Za-z0-9_]*)\\s*\"\\s*:");

    private static final Pattern FULL_WIDTH_FIELD_SEPARATOR_PATTERN =
            Pattern.compile("\"\\s*([A-Za-z_][A-Za-z0-9_]*)\\s*\"\\s*：");

    private static final Pattern TRAILING_COMMA_PATTERN =
            Pattern.compile(",\\s*([}\\]])");

    private static final Pattern DUPLICATE_COMMA_PATTERN =
            Pattern.compile(",\\s*,+");

    private LlmJsonUtils() {
    }

    /**
     * 规范化 LLM 返回的 JSON 字符串。
     * 支持处理 markdown 代码块，或提取混杂文本中的 JSON 片段。
     */
    public static String normalizeJsonContent(String content) {
        if (content == null) {
            return null;
        }

        String trimmed = content.replace("\uFEFF", "").trim();
        if (trimmed.isEmpty()) {
            return trimmed;
        }

        Matcher matcher = MARKDOWN_JSON_BLOCK_PATTERN.matcher(trimmed);
        if (matcher.find()) {
            trimmed = matcher.group(1).trim();
        }

        String extracted = extractJsonCandidate(trimmed);
        return extracted == null ? trimmed : extracted;
    }

    /**
     * 修复常见的 JSON 轻微语法问题。
     */
    public static String repairJsonContent(String content) {
        if (content == null) {
            return null;
        }

        String repaired = content;
        repaired = BROKEN_FIELD_NAME_PATTERN.matcher(repaired).replaceAll("\"$1\":");
        repaired = PADDED_FIELD_NAME_PATTERN.matcher(repaired).replaceAll("\"$1\":");
        repaired = FULL_WIDTH_FIELD_SEPARATOR_PATTERN.matcher(repaired).replaceAll("\"$1\":");
        repaired = DUPLICATE_COMMA_PATTERN.matcher(repaired).replaceAll(",");
        repaired = TRAILING_COMMA_PATTERN.matcher(repaired).replaceAll("$1");
        return repaired.trim();
    }

    /**
     * 从文本中提取最可能的 JSON 对象或数组。
     */
    public static String extractJsonCandidate(String text) {
        if (text == null || text.isEmpty()) {
            return null;
        }

        int objectStart = text.indexOf('{');
        int arrayStart = text.indexOf('[');

        if (objectStart == -1 && arrayStart == -1) {
            return null;
        }

        if (objectStart == -1) {
            return extractByBounds(text, '[', ']');
        }
        if (arrayStart == -1) {
            return extractByBounds(text, '{', '}');
        }

        if (objectStart < arrayStart) {
            String objectJson = extractByBounds(text, '{', '}');
            return objectJson != null ? objectJson : extractByBounds(text, '[', ']');
        }

        String arrayJson = extractByBounds(text, '[', ']');
        return arrayJson != null ? arrayJson : extractByBounds(text, '{', '}');
    }

    private static String extractByBounds(String text, char startChar, char endChar) {
        int start = text.indexOf(startChar);
        int end = text.lastIndexOf(endChar);
        if (start == -1 || end == -1 || end < start) {
            return null;
        }
        return text.substring(start, end + 1).trim();
    }
}
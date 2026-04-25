package com.ywt.passage.utils;

import com.ywt.passage.constant.PromptConstant;
import com.ywt.passage.model.enums.ArticleStyleEnum;

/**
 * 风格 Prompt 工具类
 */
public class StylePromptUtil {

    /**
     * 根据风格获取对应的 Prompt 附加内容
     */
    public static String getStylePrompt(String style) {
        if (style == null || style.isEmpty()) {
            return "";
        }

        ArticleStyleEnum styleEnum = ArticleStyleEnum.getEnumByValue(style);
        if (styleEnum == null) {
            return "";
        }

        return switch (styleEnum) {
            case TECH -> PromptConstant.STYLE_TECH_PROMPT;
            case EMOTIONAL -> PromptConstant.STYLE_EMOTIONAL_PROMPT;
            case EDUCATIONAL -> PromptConstant.STYLE_EDUCATIONAL_PROMPT;
            case HUMOROUS -> PromptConstant.STYLE_HUMOROUS_PROMPT;
        };
    }
}

package com.ywt.passage.utils;

import com.ywt.passage.model.dto.article.ArticleState;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

class LlmJsonUtilsTest {

    @Test
    void shouldRepairBrokenOutlineJson() {
        String malformedJson = """
                ```json
                {
                  "sections": [
                    {
                      "section": 1,
                      "title": "第一章",
                      " "points": ["要点1", "要点2",],
                    }
                  ],
                }
                ```
                """;

        String repairedJson = LlmJsonUtils.repairJsonContent(
                LlmJsonUtils.normalizeJsonContent(malformedJson)
        );

        ArticleState.OutlineResult outlineResult = GsonUtils.fromJson(repairedJson, ArticleState.OutlineResult.class);
        assertNotNull(outlineResult);
        assertNotNull(outlineResult.getSections());
        assertEquals(1, outlineResult.getSections().size());
        assertEquals(List.of("要点1", "要点2"), outlineResult.getSections().get(0).getPoints());
    }

    @Test
    void shouldExtractJsonFromMixedContent() {
        String mixedContent = "LLM 输出如下：\n```json\n{\n  \"mainTitle\": \"标题\",\n  \"subTitle\": \"副标题\"\n}\n```\n请查收";

        String normalizedJson = LlmJsonUtils.normalizeJsonContent(mixedContent);
        ArticleState.TitleResult titleResult = GsonUtils.fromJson(normalizedJson, ArticleState.TitleResult.class);

        assertNotNull(titleResult);
        assertEquals("标题", titleResult.getMainTitle());
        assertEquals("副标题", titleResult.getSubTitle());
    }
}
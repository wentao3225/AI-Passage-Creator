import { marked } from "marked";
/**
 * Markdown 转 HTML
 */
export const markdownToHtml = (markdown) => {
    return marked(markdown);
};

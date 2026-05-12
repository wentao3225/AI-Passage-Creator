import { marked } from "marked"

type ArticleImageLike = {
  position?: number
  url?: string
}

type ArticleMarkdownLike = {
  fullContent?: string
  content?: string
  coverImage?: string
  images?: ArticleImageLike[]
}

/**
 * Markdown 转 HTML
 */
export const markdownToHtml = (markdown: string): string => {
  return marked(markdown) as string
}

/**
 * 获取文章封面图 URL。
 */
export const resolveArticleCoverImage = (article?: ArticleMarkdownLike | null): string => {
  if (!article) {
    return ''
  }

  if (article.coverImage) {
    return article.coverImage
  }

  return article.images?.find(image => image.position === 1)?.url || ''
}

/**
 * 构造用于渲染和导出的文章 Markdown。
 * 若完整图文未内联封面图，则在顶部补上封面图。
 */
export const buildArticleMarkdown = (article?: ArticleMarkdownLike | null): string => {
  if (!article) {
    return ''
  }

  const content = article.fullContent || article.content || ''
  const coverImage = resolveArticleCoverImage(article)

  if (!coverImage || content.includes(`](${coverImage})`)) {
    return content
  }

  if (!content) {
    return `![cover](${coverImage})`
  }

  return `![cover](${coverImage})\n\n${content}`
}

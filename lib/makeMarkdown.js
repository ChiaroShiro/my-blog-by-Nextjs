import { remark } from 'remark'
import remarkMath from 'remark-math'
import remarkRehype from 'remark-rehype'
import rehypeKatex from 'rehype-katex'
import rehypeHighlight from 'rehype-highlight'
import rehypeStringify from 'rehype-stringify'

// 将内容处理成 markdown + latex 的字符串
export async function processMarkdownContent(content, options = {}) {
  const {
    allowDangerousHtml = true,
    removeHash = false
  } = options

  // 如果需要移除 # 符号
  let processedContent = content
  if (removeHash) {
    processedContent = content.replace(/#/g, '')
  }

  // 使用 remark 和 rehype 处理内容
  const processed = await remark()
    .use(remarkMath)
    .use(remarkRehype, { allowDangerousHtml })
    .use(rehypeKatex)
    .use(rehypeHighlight)
    .use(rehypeStringify, { allowDangerousHtml })
    .process(processedContent)

  return processed.toString()
}

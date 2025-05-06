import { remark } from 'remark'
import remarkSlug from 'remark-slug'
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
    .use(remarkSlug)
    .use(remarkMath)
    .use(remarkRehype, { allowDangerousHtml })
    .use(rehypeKatex)
    .use(rehypeHighlight)
    .use(rehypeStringify, { allowDangerousHtml })
    .process(processedContent)

  return processed.toString()
}

// 注释或删除目录创建代码
// const publicPostDir = path.join(process.cwd(), 'public', 'images', 'posts')
// if (!fs.existsSync(publicPostDir)){
//   fs.mkdirSync(publicPostDir, { recursive: true })
// }

// 修改为直接使用绝对路径
const getImagePath = (id) => {
  return `/static/images/posts/${id}/cover.jpg` // 改为使用Next.js默认静态路径
}

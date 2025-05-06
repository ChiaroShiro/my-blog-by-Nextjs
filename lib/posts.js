import path from 'path'
import matter from 'gray-matter'
import { processMarkdownContent } from './makeMarkdown'

let fs
if (typeof window === 'undefined') {
  fs = require('fs')
  // 其他 Node.js 模块同理
}

const postsDirectory = path.join(process.cwd(), 'posts')

export function getSortedPostsData() {
  // 获取 posts 目录下的所有文件
  const allFiles = fs.readdirSync(postsDirectory)
  
  // 过滤出 .md 文件
  const mdFiles = allFiles.filter(file => path.extname(file) === '.md')
  
  const allPostsData = mdFiles.map(fileName => {
    // 移除 ".md" 后缀作为 id
    const id = fileName.replace(/\.md$/, '')

    // 读取 markdown 文件内容
    const fullPath = path.join(postsDirectory, fileName)
    const fileContents = fs.readFileSync(fullPath, 'utf8')

    // 使用 gray-matter 解析文章元数据
    const matterResult = matter(fileContents)

    // 添加调试日志
    console.log('当前文章ID:', id)
    const coverExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.JPG', '.JPEG', '.PNG', '.WEBP']
    let coverUrl = ''
    for (const ext of coverExtensions) {
      const baseExt = ext.toLowerCase() // 统一转为小写
      const publicCoverPath = path.join(
        process.cwd(), 
        'public', 
        'posts-assets', 
        `${id}${baseExt}` // 强制小写扩展名
      )
      console.log('检测路径:', publicCoverPath)
      if (fs.existsSync(publicCoverPath)) {
        console.log('找到封面:', publicCoverPath)
        coverUrl = `/posts-assets/${id}${baseExt}`
        break
      }
    }

    // 获取文章内容的前200个字符作为简介
    const shortContent = matterResult.content.replace(/\s+/g, ' ').slice(0, 200)

    // 解析标签
    const tags = matterResult.data.tags || []

    // 获取是否顶置，默认为false
    const pinned = matterResult.data.pinned || false

    return {
      id,
      coverUrl,
      shortContent,
      tags,
      pinned, // 添加顶置标志
      ...matterResult.data
    }
  })

  // 先按顶置状态排序，再按日期排序
  return allPostsData.sort((a, b) => {
    // 如果a被顶置而b没有，a排在前面
    if (a.pinned && !b.pinned) return -1
    // 如果b被顶置而a没有，b排在前面
    if (!a.pinned && b.pinned) return 1
    // 如果两者顶置状态相同，则按日期排序
    return a.date < b.date ? 1 : -1
  })
}

export function getAllPostIds() {
  const fileNames = fs.readdirSync(postsDirectory)
  return fileNames.filter(fileName => {
    return path.extname(fileName) === '.md'
  }).map(fileName => {
    return {
      params: {
        id: fileName.replace(/\.md$/, '')
      }
    }
  })
}

export async function getPostData(id) {
  const fullPath = path.join(postsDirectory, `${id}.md`)
  const fileContents = fs.readFileSync(fullPath, 'utf8')

  // 使用 gray-matter 解析文章元数据
  const matterResult = matter(fileContents)

  // 处理 Markdown 内容
  const processedHtml = await processMarkdownContent(matterResult.content)
  const contentHtml = processedHtml
  // 提取所有标题生成目录
  const headings = []
  const headingRegex = /<h([1-6]) id="([^"]+)">([\s\S]*?)<\/h\1>/g
  let match
  while ((match = headingRegex.exec(contentHtml)) !== null) {
    headings.push({
      depth: parseInt(match[1], 10),
      id: match[2],
      text: match[3].replace(/<[^>]+>/g, '')
    })
  }

  // 解析标签
  const tags = matterResult.data.tags || []

  // 获取是否顶置
  const pinned = matterResult.data.pinned || false

  // 移除本地图片路径处理
  delete matterResult.data.localCover
  // 返回文章详情，包括 HTML 内容和目录 headings
  return {
    coverUrl: `https://your-cdn.com/posts/${id}/cover.jpg`,
    id,
    contentHtml,
    headings,
    tags,
    pinned, // 添加顶置标志
    ...matterResult.data
  }
}
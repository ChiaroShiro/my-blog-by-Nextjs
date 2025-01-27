import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { processMarkdownContent } from './makeMarkdown'

const postsDirectory = path.join(process.cwd(), 'posts')

// 递归获取所有 .md 文件
function getAllMarkdownFiles(dir) {
  let results = []
  const list = fs.readdirSync(dir)
  list.forEach(file => {
    const filePath = path.join(dir, file)
    const stat = fs.statSync(filePath)
    if (stat && stat.isDirectory()) {
      results = results.concat(getAllMarkdownFiles(filePath))
    } else if (path.extname(file) === '.md') {
      results.push(filePath)
    }
  })
  return results
}

// 获取文章封面图片地址
function getCoverImagePath(id) {
  const coverPath = path.join(postsDirectory, id)
  const coverDir = path.dirname(coverPath)
  
  // 确保目录存在
  if (!fs.existsSync(coverDir)) {
    fs.mkdirSync(coverDir, { recursive: true })
  }
  
  // 检查 jpg 或 png 格式的封面图片
  const extensions = ['.jpg', '.png']
  for (const ext of extensions) {
    if (fs.existsSync(coverPath + ext)) {
      return `/posts/${id}${ext}`
    }
  }
  return ''
}

export function getSortedPostsData() {
  const filePaths = getAllMarkdownFiles(postsDirectory)
  
  const allPostsData = filePaths.map(filePath => {
    // 获取相对于 posts 目录的路径作为 id，并将反斜杠替换为正斜杠
    const id = path.relative(postsDirectory, filePath).replace(/\.md$/, '').replace(/\\/g, '/')

    // 读取 markdown 文件内容
    const fileContents = fs.readFileSync(filePath, 'utf8')

    // 使用 gray-matter 解析文章元数据
    const matterResult = matter(fileContents)

    // 获取封面图片地址
    const picadd = getCoverImagePath(id)

    // 获取文章内容的前200个字符作为简介
    const shortContent = matterResult.content.replace(/\s+/g, ' ').slice(0, 200)

    // 解析标签
    const tags = matterResult.data.tags || []

    return {
      id,
      picadd,
      shortContent,
      tags,
      ...matterResult.data
    }
  })

  // 按日期排序
  return allPostsData.sort((a, b) => a.date < b.date ? 1 : -1)
}

export function getAllPostIds() {
  const filePaths = getAllMarkdownFiles(postsDirectory)

  return filePaths.map(filePath => {
    // 获取相对于 posts 目录的路径作为 id，并将反斜杠替换为正斜杠
    const relativePath = path.relative(postsDirectory, filePath).replace(/\.md$/, '').replace(/\\/g, '/')
    return {
      params: {
        id: relativePath.split('/')
      }
    }
  })
}

export async function getPostData(id) {
  // 将 id 中的正斜杠替换为系统路径分隔符
  const normalizedId = id.replace(/\//g, path.sep)
  const fullPath = path.join(postsDirectory, `${normalizedId}.md`)
  const fileContents = fs.readFileSync(fullPath, 'utf8')

  // 使用 gray-matter 解析文章元数据
  const matterResult = matter(fileContents)

  // 处理 Markdown 内容
  const contentHtml = await processMarkdownContent(matterResult.content)

  // 解析标签
  const tags = matterResult.data.tags || []

  return {
    id,
    contentHtml,
    tags,
    ...matterResult.data
  }
}
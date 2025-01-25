import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { remark } from 'remark'
import remarkMath from 'remark-math'
import remarkRehype from 'remark-rehype'
import rehypeKatex from 'rehype-katex'
import rehypeStringify from 'rehype-stringify'
import rehypeHighlight from 'rehype-highlight'

const postsDirectory = path.join(process.cwd(), 'posts')
const coverDirectory = path.join(process.cwd(), 'public/cover')

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
  const coverPathJpg = path.join(coverDirectory, `${id}.jpg`)
  const coverPathPng = path.join(coverDirectory, `${id}.png`)
  // 创建目录路径
  const coverDir = path.dirname(coverPathJpg)
  // 确保目录存在
  if (!fs.existsSync(coverDir)) {
    fs.mkdirSync(coverDir, { recursive: true })
  }
  
  let picadd = '/images/default-cover.jpg'
  if (fs.existsSync(coverPathJpg)) {
    picadd = `/cover/${id}.jpg`
  } else if (fs.existsSync(coverPathPng)) {
    picadd = `/cover/${id}.png`
  }
  return picadd
}

// 处理 Markdown 内容
async function processMarkdown(content) {
  const processedContent = await remark()
    .use(remarkMath)
    .use(remarkRehype, {allowDangerousHtml: true})
    .use(rehypeKatex)
    .use(rehypeHighlight)
    .use(rehypeStringify, {allowDangerousHtml: true})
    .process(content)
    
  return processedContent.toString()
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

    // 获取文章内容的前100个字符作为简介
    const shortContent = matterResult.content.replace(/\s+/g, ' ').slice(0, 100)

    return {
      id,
      picadd,
      shortContent,
      ...matterResult.data
    }
  })

  // 按日期排序
  return allPostsData.sort((a, b) => {
    if (a.date < b.date) {
      return 1
    } else {
      return -1
    }
  })
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
  const contentHtml = await processMarkdown(matterResult.content)

  return {
    id,
    contentHtml,
    ...matterResult.data
  }
}
import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { remark } from 'remark'
import html from 'remark-html'
import remarkMath from 'remark-math'
import remarkHighlight from 'remark-highlight.js'
import remarkHtml from 'remark-html'
import remarkRehype from 'remark-rehype'
import rehypeKatex from 'rehype-katex'
import rehypeStringify from 'rehype-stringify'
import rehypeHighlight from 'rehype-highlight'

const postsDirectory = path.join(process.cwd(), 'posts')

export function getSortedPostsData() {
  // 递归获取所有 .md 文件
  function getAllFiles(dir) {
    let results = []
    const list = fs.readdirSync(dir)
    list.forEach(file => {
      const filePath = path.join(dir, file)
      const stat = fs.statSync(filePath)
      if (stat && stat.isDirectory()) {
        results = results.concat(getAllFiles(filePath))
      } else if (path.extname(file) === '.md') {
        results.push(filePath)
      }
    })
    return results
  }

  const filePaths = getAllFiles(postsDirectory)
  const allPostsData = filePaths.map(filePath => {
    // 获取相对于 posts 目录的路径作为 id
    const id = path.relative(postsDirectory, filePath).replace(/\.md$/, '')

    // 读取 markdown 文件内容
    const fileContents = fs.readFileSync(filePath, 'utf8')

    // 使用 gray-matter 解析文章元数据
    const matterResult = matter(fileContents)

    return {
      id,
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
  // 递归获取所有 .md 文件路径
  function getAllFiles(dir) {
    let results = []
    const list = fs.readdirSync(dir)
    list.forEach(file => {
      const filePath = path.join(dir, file)
      const stat = fs.statSync(filePath)
      if (stat && stat.isDirectory()) {
        results = results.concat(getAllFiles(filePath))
      } else if (path.extname(file) === '.md') {
        results.push(filePath)
      }
    })
    return results
  }

  const filePaths = getAllFiles(postsDirectory)

  return filePaths.map(filePath => {
    // 获取相对于 posts 目录的路径作为 id
    const relativePath = path.relative(postsDirectory, filePath).replace(/\.md$/, '')
    return {
      params: {
        id: relativePath.split(path.sep)
      }
    }
  })
}

export async function getPostData(id) {
  const fullPath = path.join(postsDirectory, `${id}.md`)
  const fileContents = fs.readFileSync(fullPath, 'utf8')

  // 使用 gray-matter 解析文章元数据
  const matterResult = matter(fileContents)

  // 使用 remark 和 rehype 处理 Markdown
  const processedContent = await remark()
    .use(remarkMath)
    .use(remarkRehype, {allowDangerousHtml: true})
    .use(rehypeKatex)
    .use(rehypeHighlight)
    .use(rehypeStringify, {allowDangerousHtml: true})
    .process(matterResult.content)
    
  const contentHtml = processedContent.toString()

  return {
    id,
    contentHtml,
    ...matterResult.data
  }
}
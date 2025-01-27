import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { processMarkdownContent } from './makeMarkdown'

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

    // 查找对应的封面图片
    let picadd = null
    const imgExts = ['.jpg', '.png']
    for (const imgExt of imgExts) {
      const imgName = `${id}${imgExt}`
      const imgPath = path.join(postsDirectory, imgName)
      if (fs.existsSync(imgPath)) {
        picadd = `/images/posts/${imgName}` // 修改图片路径
        // 确保图片目录存在
        const publicImgDir = path.join(process.cwd(), 'public', 'images', 'posts')
        if (!fs.existsSync(publicImgDir)) {
          fs.mkdirSync(publicImgDir, { recursive: true })
        }
        // 复制图片到public目录
        fs.copyFileSync(imgPath, path.join(publicImgDir, imgName))
        break
      }
    }

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
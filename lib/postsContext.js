import { getSortedPostsData } from './posts'
import { createContext } from 'react'

// 确保上下文提供正确字段
const PostsContext = createContext({
  allPostsData: [] // 每个post对象应包含coverUrl字段
})

export async function getPostsContext() {
  const allPostsData = await getSortedPostsData()
  return {
    allPostsData,
    lastUpdateTime: new Date().toLocaleDateString()
  }
} 
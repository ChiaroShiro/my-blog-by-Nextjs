import { getSortedPostsData } from './posts'

export async function getPostsContext() {
  const allPostsData = await getSortedPostsData()
  return {
    allPostsData,
    lastUpdateTime: new Date().toLocaleDateString()
  }
} 
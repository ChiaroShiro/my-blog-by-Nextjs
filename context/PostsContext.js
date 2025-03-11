import { createContext } from 'react'

// 建造一个叫 PostsContext 的广播塔
export const PostsContext = createContext()

export function PostsProvider({ children, value = { allPostsData: [] } }) {
  return (
    <PostsContext.Provider value={value}>
      {children}
    </PostsContext.Provider>
  )
} 
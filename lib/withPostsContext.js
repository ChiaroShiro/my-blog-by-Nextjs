import { getPostsContext } from './postsContext'

export function withPostsContext(getStaticPropsFunc) {
  return async (context) => {
    const originalProps = await (getStaticPropsFunc?.(context) || Promise.resolve({ props: {} }))
    const postsContextValue = await getPostsContext()
    
    return {
      ...originalProps,
      props: {
        ...originalProps.props,
        postsContextValue
      }
    }
  }
} 
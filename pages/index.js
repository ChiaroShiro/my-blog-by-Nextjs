import BlogCard from '../components/blogCard'
import styles from '../styles/Home.module.css'
import { getPostsContext } from '../lib/postsContext'
import { withPostsContext } from '../lib/withPostsContext'

export default function Home({ postsContextValue }) {
  console.log('首篇文章数据:', postsContextValue.allPostsData[0])
  console.log('所有文章数据:', postsContextValue.allPostsData)
  return (
    <section className={styles.blogGrid}>
      {postsContextValue.allPostsData.map(({ id, date, title, coverUrl, shortContent, tags }, index) => (
        <BlogCard
          key={id}
          id={id}
          coverUrl={coverUrl}
          date={date}
          title={title}
          tags={tags}
          shortContent={shortContent}
          index={index}
        />
      ))}
    </section>
  )
}

export const getStaticProps = withPostsContext(async () => {
  // 这里可以添加页面特有的数据获取逻辑
  return {
    props: {
      // 页面特有的props
    }
  }
})
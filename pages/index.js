import BlogCard from '../components/blogCard'
import styles from '../styles/Home.module.css'
import { getPostsContext } from '../lib/postsContext'
import { withPostsContext } from '../lib/withPostsContext'

export default function Home({ postsContextValue }) {
  return (
    <section className={styles.blogGrid}>
      {postsContextValue.allPostsData.map(({ id, date, title, picadd, shortContent, tags }) => (
        <BlogCard
          key={id}
          id={id}
          date={date}
          title={title}
          picadd={picadd}
          tags={tags}
          shortContent={shortContent}
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
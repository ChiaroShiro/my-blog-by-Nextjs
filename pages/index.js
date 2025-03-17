import BlogCard from '../components/blogCard'
import styles from '../styles/Home.module.css'
import { getPostsContext } from '../lib/postsContext'
import { withPostsContext } from '../lib/withPostsContext'

export default function Home({ postsContextValue }) {
  console.log('所有文章数据:', postsContextValue.allPostsData)
  return (
    <section className={styles.blogGrid}>
      {postsContextValue.allPostsData.map(({ id, date, title, coverUrl, shortContent, tags, pinned }, index) => (
        <BlogCard
          key={id}
          id={id}
          coverUrl={coverUrl}
          date={date}
          title={title}
          tags={tags}
          shortContent={shortContent}
          index={index}
          pinned={pinned}
        />
      ))}
    </section>
  )
}

export const getStaticProps = withPostsContext(async () => {
  return {
    props: {}
  }
})
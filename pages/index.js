import Layout from '../components/layout'
import { getSortedPostsData } from '../lib/posts'
import BlogCard from '../components/blogCard'
import styles from '../styles/Home.module.css'

export default function Home({ allPostsData }) {
  return (
    <Layout home>
      <section className={styles.blogGrid}>
        {allPostsData.map(({ id, date, title, picadd, shortContent, tags }) => (
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
    </Layout>
  )
}

export async function getStaticProps() {
  const allPostsData = getSortedPostsData()
  return {
    props: {
      allPostsData
    }
  }
}
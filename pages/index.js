import Layout, { siteTitle } from '../components/layout'
import utilStyles from '../styles/utils.module.css'
import { getSortedPostsData } from '../lib/posts'
import Link from 'next/link'
import Date from '../components/date'
import styles from '../styles/Home.module.css'

export default function Home({ allPostsData }) {
  return (
    <Layout home>
      <section className={styles.blogGrid}>
        {allPostsData.map(({ id, date, title, picadd, shortContent }) => (
          <Link href={`/posts/${id}`} key={id}>
            <div className={styles.blogCard} style={{backgroundImage: `url(${picadd})`}}>
              <div className={styles.blogContent}>
                <h2 className={styles.blogTitle}>{title}</h2>
                <p className={styles.blogExcerpt}>{shortContent}...</p>
                <small className={styles.blogDate}>
                  <Date dateString={date} />
                </small>
              </div>
            </div>
          </Link>
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
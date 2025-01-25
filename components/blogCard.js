import Link from 'next/link'
import Date from './date'
import styles from '../styles/blogCard.module.css'

export default function BlogCard({ id, date, title, picadd, shortContent }) {
  return (
    <Link href={`/posts/${id}`}>
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
  )
}

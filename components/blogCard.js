import Link from 'next/link'
import Date from './date'
import styles from '../styles/blogCard.module.css'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import { processMarkdownContent } from '../lib/makeMarkdown'
import 'katex/dist/katex.min.css'
import 'highlight.js/styles/github.css'

export default function BlogCard({ id, date, title, picadd, shortContent }) {
  const [processedContent, setProcessedContent] = useState(shortContent)
  
  useEffect(() => {
    const processContent = async () => {
      const processed = await processMarkdownContent(shortContent, {
        removeHash: true
      })
      setProcessedContent(processed)
    }

    processContent()
  }, [shortContent])

  return (
    <Link href={`/posts/${id}`}>
      <div className={styles.blogCard}>
        <Image 
          src={picadd} 
          alt={title} 
          fill={true}
          className={styles.blogImage}
        />
        <div className={styles.blogContent}>
          <h2 className={styles.blogTitle}>{title}</h2>
          <p className={styles.blogExcerpt} 
             dangerouslySetInnerHTML={{__html: processedContent}} />
          <small className={styles.blogDate}>
            <Date dateString={date} />
          </small>
        </div>
      </div>
    </Link>
  )
}

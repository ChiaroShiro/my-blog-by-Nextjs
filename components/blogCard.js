import Link from 'next/link'
import Date from './date'
import styles from '../styles/components/blogCard.module.css'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import { processMarkdownContent } from '../lib/makeMarkdown'
import Tags from './tags'

export default function BlogCard({ id, date, title, picadd, shortContent, tags }) {
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
      <div className={picadd ? styles.blogCard : styles.blogCardNoImage}>
        {picadd && (
          <Image 
            src={picadd} 
            alt={title} 
            fill={true}
            className={styles.blogImage}
          />
        )}
        <div className={styles.blogContent}>
          <h2 className={styles.blogTitle}>
            <span>{title}</span>
            <Tags tags={tags} />
          </h2>
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

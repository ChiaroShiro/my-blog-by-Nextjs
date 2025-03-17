import Link from 'next/link'
import Date from './date'
import styles from '../styles/components/blogCard.module.css'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import { processMarkdownContent } from '../lib/makeMarkdown'
import Tags from './tags'

export default function BlogCard({ id, coverUrl, date, title, shortContent, tags, index, pinned }) {
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

  console.log(`渲染文章 ${id}，封面URL: ${coverUrl}`)
  
  return (
    <Link href={`/posts/${id}`}>
      <div className={coverUrl ? styles.blogCard : styles.blogCardNoImage}>
        {coverUrl && (
          <Image
            src={coverUrl}
            alt={`${title} 封面图`}
            fill
            className={styles.blogImage}
            priority={index < 3}
            unoptimized={process.env.NODE_ENV === 'development'}
            quality={85}
            sizes="(max-width: 768px) 100vw, 400px"
            style={{
              objectFit: 'cover',
              objectPosition: 'center'
            }}
          />
        )}
        {pinned && (
          <div className={styles.pinnedBadge}></div>
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

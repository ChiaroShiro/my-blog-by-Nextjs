import Link from 'next/link'
import Date from './date'
import styles from '../styles/blogCard.module.css'
import { useEffect, useState } from 'react'
import { remark } from 'remark'
import remarkMath from 'remark-math'
import remarkRehype from 'remark-rehype'
import rehypeKatex from 'rehype-katex'
import rehypeStringify from 'rehype-stringify'
import Image from 'next/image'

export default function BlogCard({ id, date, title, picadd, shortContent }) {
  const [processedContent, setProcessedContent] = useState(shortContent)
  
  useEffect(() => {
    const processContent = async () => {
      // 移除 shortContent 中的 #
      const cleanedContent = shortContent.replace(/#/g, '')
      
      // 使用 remark 和 rehype 处理内容
      const processed = await remark()
        .use(remarkMath)
        .use(remarkRehype, { allowDangerousHtml: true })
        .use(rehypeKatex)
        .use(rehypeStringify, { allowDangerousHtml: true })
        .process(cleanedContent)

      setProcessedContent(processed.toString())
    }

    processContent()
  }, [shortContent])

  return (
    <Link href={`/posts/${id}`}>
      <div className={styles.blogCard}>
        <Image src={picadd} alt={title} layout="fill" objectFit="cover" className={styles.blogImage} />
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

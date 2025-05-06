import Layout from '../../components/layout'
import { getAllPostIds, getPostData } from '../../lib/posts'
import Head from 'next/head'
import Date from '../../components/date'
import utilStyles from '../../styles/utils.module.css'
import postsContentStyles from '../../styles/posts-content.module.css'
import Tags from '../../components/tags'
import { getPostsContext } from '../../lib/postsContext'
import { withPostsContext } from '../../lib/withPostsContext'
import TableOfContents from '../../components/TableOfContents'

export async function getStaticPaths() {
  const paths = getAllPostIds()
  return {
    paths,
    fallback: false
  }
}

export default function Post({ postData }) {
  const { title, date, tags, contentHtml, headings } = postData
  return (
    <div className={postsContentStyles['post-with-toc']}>
      {headings && headings.length > 0 && <TableOfContents headings={headings} />}
      <article className={postsContentStyles['article-container']}>
        <div className={postsContentStyles['article-header']}>
          <h1 className={utilStyles.headingXl}>{title}</h1>
          <div className={`${utilStyles.lightText} ${postsContentStyles['post-meta']}`}>
            <Date dateString={date} />
            <Tags tags={tags} />
          </div>
        </div>
        <div 
          dangerouslySetInnerHTML={{ __html: contentHtml }}
          className={postsContentStyles['markdown-content']}
        />
      </article>
    </div>
  )
}

export const getStaticProps = withPostsContext(async ({ params }) => {
  const postData = await getPostData(params.id)
  return {
    props: {
      postData
    }
  }
})
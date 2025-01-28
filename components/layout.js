import Head from 'next/head'
import styles from '../styles/components/layout.module.css'
import Router from 'next/router'
import NProgress from 'nprogress'
import { useEffect, useContext } from 'react'
import LeftSideBar from './sideBar/leftSideBar'
import { PostsContext } from '../context/PostsContext'
import RightSideBar from './sideBar/rightSideBar'

export const siteTitle = 'Chiaro\'s Blog'

// 配置 NProgress
NProgress.configure({ showSpinner: true })

export default function Layout({ children }) {
  const { allPostsData, lastUpdateTime } = useContext(PostsContext)

  useEffect(() => {
    // 监听路由事件以显示加载条
    Router.events.on('routeChangeStart', () => NProgress.start())
    Router.events.on('routeChangeComplete', () => NProgress.done()) 
    Router.events.on('routeChangeError', () => NProgress.done())

    // 清理事件监听器
    return () => {
      Router.events.off('routeChangeStart', () => NProgress.start())
      Router.events.off('routeChangeComplete', () => NProgress.done())
      Router.events.off('routeChangeError', () => NProgress.done())
    }
  }, [])

  return (
    <div className={styles.sidebarContainer}>
      <Head>
        <title>{siteTitle}</title>
        <link rel="icon" href="/favicon.ico" />
        <meta
          name="description"
          content="Learn how to build a personal website using Next.js"
        />
        <meta
          property="og:image"
          content={`https://og-image.now.sh/${encodeURI(
            siteTitle
          )}.png?theme=light&md=0&fontSize=75px&images=https%3A%2F%2Fassets.vercel.com%2Fimage%2Fupload%2Ffront%2Fassets%2Fdesign%2Fnextjs-black-logo.svg`}
        />
        <meta name="og:title" content={siteTitle} />
        <meta name="twitter:card" content="summary_large_image" />
      </Head>

      <LeftSideBar />
      <main className={styles.mainContent}>
        <div className={styles.contentWrapper}>
          {children}
        </div>
      </main>
      <RightSideBar allPostsData={allPostsData} lastUpdateTime={lastUpdateTime} />
    </div>
  )
}
import Head from 'next/head'
import styles from '../styles/layout.module.css'
import utilStyles from '../styles/utils.module.css'
import Link from 'next/link'
import profileData from '../config/profileData'
import Router from 'next/router'
import NProgress from 'nprogress'
import { useEffect } from 'react'

const name = profileData.id
export const siteTitle = 'Chiaro\'s Blog'

// 配置 NProgress
NProgress.configure({ showSpinner: true })

export default function Layout({ children, home }) {
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
    <div className={styles.pageContainer}>
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

      <aside className={styles.sidebar}>
        <div className={styles.sidebarProfile}>
          <img
            src={profileData.avatar}
            className={`${styles.profileImage} ${utilStyles.borderCircle}`}
            alt={name}
          />
          <h2 className={styles.profileName}>{name}</h2>
          <p className={styles.profileBio}>
            {profileData.bio}
          </p>
        </div>
        
        <nav className={styles.sidebarNav}>
          <ul>
            <li>
              <Link href="/" className={styles.navLink}> 
                首页 
              </Link>
            </li>
            <li>
              <Link href="/categories" className={styles.navLink}>
                分类
              </Link>
            </li>
            <li>
              <Link href="/posts/about" className={styles.navLink}>
                关于
              </Link>
            </li>
            <li>
              <Link href="https://github.com/ChiaroShiro/blog-by-Next.js" className={styles.navLink}>
                项目
              </Link>
            </li>
          </ul>
        </nav>
      </aside>
      <main className={styles.mainContent}>
        {children}
      </main> 
    </div>
  )
}
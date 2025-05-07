import { useEffect, useState, useContext, useRef } from 'react'
import styles from '../../styles/components/sideBar/rightSideBar.module.css'
import Tags from '../../components/tags'
import TableOfContents from '../TableOfContents'
import dayjs from 'dayjs'
import { PostsContext } from '../../context/PostsContext'

export default function RightSideBar({ allPostsData, lastUpdateTime, postData }) {
  const { lastUpdateTime: contextLastUpdateTime } = useContext(PostsContext)
  // 用于忽略点击 TOC 后的首次 scroll 事件
  const skipScrollRef = useRef(false)
  const [runningDays, setRunningDays] = useState(0)
  const headings = postData?.headings || []
  const [showTOC, setShowTOC] = useState(false)

  useEffect(() => {
    // 计算运行天数
    const startDate = new Date('2025-01-24')
    const today = new Date()
    const diffTime = Math.abs(today - startDate)
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    setRunningDays(diffDays)
  }, [])

  // 新增运行天数计算
  const startDate = dayjs('2025-01-24')
  const daysRunning = dayjs().diff(startDate, 'day')

  // 收集所有标签
  const allTags = [...new Set(allPostsData.flatMap(post => post.tags || []))]

  // 滚动监听: 向下滑动显示目录，向上滑动显示默认内容
  useEffect(() => {
    if (!headings.length) return
    let prevY = window.scrollY
    const onScroll = () => {
      // 忽略点击 TOC 后的首次滚动跳转
      if (skipScrollRef.current) {
        skipScrollRef.current = false
        prevY = window.scrollY
        return
      }
      const curY = window.scrollY
      if (curY > prevY) setShowTOC(true)
      else if (curY < prevY) setShowTOC(false)
      prevY = curY
    }
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [headings])

  return (
    <aside className={styles.sidebar}>
      {/* 默认内容: 滑出/滑入动画 */}
      <div className={`${styles.slideDefault} ${showTOC ? styles.hiddenDefault : ''}`}>  
        {/* 博客信息概览 */}
        <div className={styles.statsContainer}>
          <h3 className={styles.statsTitle}>博客统计</h3>
          <div className={styles.statsGrid}>
            <div className={styles.statsItem}>
              <span className={styles.statsLabel}>文章数量</span>
              <span className={styles.statsValue}>{allPostsData.length}</span>
            </div>
            <div className={styles.statsItem}>
              <span className={styles.statsLabel}>博客运行天数</span>
              <span className={styles.statsValue}>{daysRunning}</span>
            </div>
            <div className={styles.statsItem}>
              <span className={styles.statsLabel}>最后更新</span>
              <span className={styles.statsValue}>{contextLastUpdateTime}</span>
            </div>
          </div>
        </div>

        {/* 标签云 */}
        <div className={styles.tagCloud}>
          <h3 className={styles.tagCloudTitle}>标签云</h3>
          <Tags tags={allTags} />
        </div>
      </div>
      {/* 目录: 滑入/滑出动画 */}
      {headings.length > 0 && (
        <div
          className={`${styles.slideTOC} ${showTOC ? styles.visibleTOC : ''}`}
          // 点击 TOC 链接时，跳转 scroll 不触发隐藏逻辑
          onClick={() => { skipScrollRef.current = true }}
        >
          {/* 目录标题 '章节' */}
          <h3 className={styles.statsTitle}>章节</h3>
          <TableOfContents headings={headings} />
        </div>
      )}
    </aside>
  )
}

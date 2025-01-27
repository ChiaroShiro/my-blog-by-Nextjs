import { useEffect, useState } from 'react'
import styles from '../../styles/components/sideBar/rightSideBar.module.css'
import Tags from '../../components/tags'

export default function RightSideBar({ allPostsData, lastUpdateTime }) {
  const [runningDays, setRunningDays] = useState(0)

  useEffect(() => {
    // 计算运行天数
    const startDate = new Date('2023-11-24')
    const today = new Date()
    const diffTime = Math.abs(today - startDate)
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    setRunningDays(diffDays)
  }, [])

  // 收集所有标签
  const allTags = [...new Set(allPostsData.flatMap(post => post.tags || []))]

  return (
    <aside className={styles.sidebar}>
      {/* 博客信息概览 */}
      <div className={styles.statsContainer}>
        <h3 className={styles.statsTitle}>博客统计</h3>
        <div className={styles.statsGrid}>
          <div className={styles.statsItem}>
            <span className={styles.statsLabel}>文章数量</span>
            <span className={styles.statsValue}>{allPostsData.length}</span>
          </div>
          <div className={styles.statsItem}>
            <span className={styles.statsLabel}>运行天数</span>
            <span className={styles.statsValue}>{runningDays}</span>
          </div>
          <div className={styles.statsItem}>
            <span className={styles.statsLabel}>最后更新</span>
            <span className={styles.statsValue}>{lastUpdateTime}</span>
          </div>
        </div>
      </div>

      {/* 标签云 */}
      <div className={styles.tagCloud}>
        <h3 className={styles.tagCloudTitle}>标签云</h3>
        <Tags tags={allTags} />
      </div>
    </aside>
  )
}

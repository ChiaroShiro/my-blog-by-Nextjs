import Link from 'next/link'
import styles from '../../styles/leftSideBar.module.css'
import utilStyles from '../../styles/utils.module.css'
import profileData from '../../config/profileData'

const name = profileData.id

export default function LeftSideBar() {
  return (
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
  )
}

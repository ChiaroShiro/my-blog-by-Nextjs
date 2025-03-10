import { useState, useMemo } from 'react'
import Fuse from 'fuse.js'
import styles from '../styles/components/searchBox.module.css'

const fuseOptions = {
  keys: [
    { name: 'title', weight: 0.5 },
    { name: 'shortContent', weight: 0.3 },
    { name: 'tags', weight: 0.2 }
  ],
  threshold: 0.3,
  ignoreLocation: true
}

export default function SearchBox({ allPostsData }) {
  const [query, setQuery] = useState('')
  
  const fuse = useMemo(() => 
    new Fuse(allPostsData, fuseOptions), 
    [allPostsData]
  )

  const results = useMemo(() => 
    query ? fuse.search(query).map(r => r.item) : allPostsData
  , [query, fuse])

  return (
    <div className={styles.searchContainer}>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="搜索文章..."
        className={styles.searchInput}
      />
      
      {query && (
        <div className={styles.resultsPanel}>
          {results.map(post => (
            <SearchResultItem key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  )
}

function SearchResultItem({ post }) {
  return (
    <a href={`/posts/${post.id}`} className={styles.resultItem}>
      <h4>{post.title}</h4>
      <p>{post.shortContent?.substring(0, 80)}...</p>
      <div className={styles.meta}>
        {post.tags?.map(tag => (
          <span key={tag} className={styles.tag}>{tag}</span>
        ))}
      </div>
    </a>
  )
}
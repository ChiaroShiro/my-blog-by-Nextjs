import React, { useState, useMemo } from 'react'
import styles from '../styles/components/tableOfContents.module.css'

// 构建带 parentId 的树
function buildTreeWithParent(headings) {
  const root = []
  const stack = [{ depth: 0, id: null, children: root }]
  headings.forEach(heading => {
    const { depth, id, text, children } = heading
    while (stack.length && depth <= stack[stack.length - 1].depth) {
      stack.pop()
    }
    const parent = stack[stack.length - 1]
    const node = { ...heading, children: [], parentId: parent.id }
    parent.children.push(node)
    stack.push(node)
  })
  return root
}

export default function TableOfContents({ headings }) {
  const [openIds, setOpenIds] = useState([])
  // 构建带 parentId 的树
  const tree = useMemo(() => buildTreeWithParent(headings), [headings])
  // 构建 parentMap 和 depthMap
  const { parentMap, depthMap } = useMemo(() => {
    const pMap = {}
    const dMap = {}
    function traverse(nodes) {
      nodes.forEach(n => {
        pMap[n.id] = n.parentId
        dMap[n.id] = n.depth
        if (n.children.length) traverse(n.children)
      })
    }
    traverse(tree)
    return { parentMap: pMap, depthMap: dMap }
  }, [tree])

  // 切换展开/收起，仅影响同层节点
  const handleToggle = id => {
    const depth = depthMap[id]
    setOpenIds(prev => {
      if (prev.includes(id)) {
        // 收起当前
        return prev.filter(x => x !== id)
      }
      // 展开当前，收起同层其他
      return [...prev.filter(x => depthMap[x] !== depth), id]
    })
  }

  const renderNodes = nodes =>
    nodes.map(node => {
      const { depth, id, text, children } = node
      const hasChildren = children.length > 0
      const isOpen = openIds.includes(id)
      return (
        <li key={id} className={`${styles.tocItem} ${styles['depth' + depth]}`}> 
          <div className={styles.tocItemHeader}>
            {hasChildren && (
              <span
                className={`${styles.toggleIcon} ${isOpen ? styles.openIcon : ''}`}
                onClick={() => handleToggle(id)}
              >
                ▶
              </span>
            )}
            <a href={`#${id}`} className={styles.tocLink}>
              {text}
            </a>
          </div>
          {hasChildren && (
            <ul className={`${styles.tocSubList} ${isOpen ? styles.tocSubListOpen : ''}`}>
              {renderNodes(children)}
            </ul>
          )}
        </li>
      )
    })

  if (!headings || headings.length === 0) return null
  return (
    <nav className={styles.tocContainer}>
      <ul className={styles.tocList}>{renderNodes(tree)}</ul>
    </nav>
  )
} 
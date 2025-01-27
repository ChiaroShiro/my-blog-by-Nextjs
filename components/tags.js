import utilStyles from '../styles/components/tags.module.css'

export default function Tags({ tags }) {
  return (
    <div className={utilStyles.tags}>
      {tags && tags.map((tag, index) => (
        <span key={index} className={utilStyles.tag}>
          {tag}
        </span>
      ))}
    </div>
  )
}

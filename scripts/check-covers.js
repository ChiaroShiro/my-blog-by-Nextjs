const fs = require('fs')
const path = require('path')

const postsDir = path.join(process.cwd(), 'posts')
const assetsDir = path.join(process.cwd(), 'public', 'posts-assets')

// 获取所有文章ID
const postIds = fs.readdirSync(postsDir)
  .filter(file => path.extname(file) === '.md')
  .map(file => path.basename(file, '.md'))

// 更新检查脚本支持大写扩展名
const extensions = ['.jpg', '.jpeg', '.png', '.webp', '.JPG', '.JPEG', '.PNG', '.WEBP']

// 检查封面图片
postIds.forEach(id => {
  const hasCover = extensions.some(ext => 
    fs.existsSync(path.join(assetsDir, `${id}${ext}`))
  )
}) 
const subsetFont = require('subset-font');
const fs = require('fs').promises;
const path = require('path');

// 定义需要处理的字体文件信息
const fontWeights = ['Light', 'Regular', 'Medium'];

// 定义文件路径
const postsDir = path.join(process.cwd(), 'posts');
const fontDir = path.join(process.cwd(), 'public/fonts');

async function run() {
    console.log('🚀 开始使用 subset-font 生成字体子集...');

    // --- 1. 收集所有需要的字符 ---
    let allText = '';
    try {
        const fileNames = await fs.readdir(postsDir);
        for (const fileName of fileNames) {
            if (path.extname(fileName) === '.md') {
                const fullPath = path.join(postsDir, fileName);
                const fileContents = await fs.readFile(fullPath, 'utf8');
                allText += fileContents;
            }
        }
    } catch (error) {
        console.error(`❌ 读取文章目录 '${postsDir}' 时出错:`, error);
        process.exit(1);
    }

    const commonChars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,;:?!@#$%^&*()[]{}-_=+`~<>/\\\'"| ';
    allText += commonChars;
    
    const uniqueChars = [...new Set(allText)].join('');
    console.log(`✒️  共找到 ${uniqueChars.length} 个独立字符。`);

    // --- 2. 循环处理每种字重的字体 ---
    for (const weight of fontWeights) {
        const originalFontName = `LXGWWenKaiGB-${weight}.ttf`;
        const subsetFontName = `LXGWWenKaiGB-${weight}.subset.woff2`;

        const originalFontPath = path.join(fontDir, originalFontName);
        const outputFontPath = path.join(fontDir, subsetFontName);
        
        try {
            if (!(await fs.stat(originalFontPath).catch(() => false))) {
                console.warn(`\n⚠️  未找到原始字体文件，跳过: ${originalFontName}`);
                continue;
            }

            console.log(`\n⏳  正在处理 ${originalFontName}...`);

            // 读取原始字体文件
            const fontBuffer = await fs.readFile(originalFontPath);

            // 生成子集
            const subsetBuffer = await subsetFont(fontBuffer, uniqueChars, {
                targetFormat: 'woff2',
            });

            // 写入新的子集文件
            await fs.writeFile(outputFontPath, subsetBuffer);
            
            const originalSize = ((await fs.stat(originalFontPath)).size / 1024 / 1024).toFixed(2);
            const newSize = ((await fs.stat(outputFontPath)).size / 1024).toFixed(2);

            console.log(`✅  成功生成子集字体: ${subsetFontName}`);
            console.log(`   - 原始大小: ${originalSize} MB`);
            console.log(`   - 新的大小: ${newSize} KB`);

        } catch (error) {
            console.error(`❌  处理 ${originalFontName} 时发生错误:`, error);
        }
    }
    console.log('\n🎉  所有字体处理完毕！');
}

run();

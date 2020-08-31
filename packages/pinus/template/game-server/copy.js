const cpy = require('cpy')
// 复制配置文件到打包好的目录中
cpy(['./config/**'], './dist/config').then(() => {
    console.log('build. config files copied')
})
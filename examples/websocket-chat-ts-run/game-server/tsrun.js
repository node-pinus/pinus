require('ts-node/register');

//
//  如果堆栈信息不准确.取消注释下面的代码应该可以解决.
//  参考 ts-node 下错误堆栈问题排查小记: https://zhuanlan.zhihu.com/p/43181384
//
/*
const sourceMapSupport = require('source-map-support');
const cacheMap = {};
const extensions = ['.ts', '.tsx'];

sourceMapSupport.install({
    environment: 'node',
    retrieveFile: function (path) {
        // 根据路径找缓存的编译后的代码
        return cacheMap[path];
    }
});

extensions.forEach(ext => {
    const originalExtension = require.extensions[ext];
    require.extensions[ext] = (module, filePath) => {
        const originalCompile = module._compile;
        module._compile = function(code, filePath) {
            // 缓存编译后的代码
            cacheMap[filePath] = code;
            return originalCompile.call(this, code, filePath);
        };
        return originalExtension(module, filePath);
    };
})

 */
require('./app');

const { spawn } = require("child_process");

console.log("!! ci-test directory:", __dirname, " cwd:", process.cwd(), " main file:", require.main.filename)

setTimeout(() => {
    console.log("start child process timeout")
    process.exit(-2)
}, 25000)

let childProcess = spawn("node", ['app.js', 'env=ci'], { cwd: __dirname + "/dist" })
childProcess.stdout.on("data", (data) => {
    // all servers startup in
    let str = data.toString()
    console.log("spawn data:", str)
    if (str.indexOf("[master-server-1 watchdog.js] all servers startup in") >= 0) {
        console.log("spawn -- start success")
        // TODO: 添加 消息测试
        // 子进程还在.  ci中没什么影响
        // 解决方法
        // https://stackoverflow.com/a/42545818/6116888
        // https://blog.michany.com/2020/01/13/NodeJS-ChildProcess/
        childProcess.kill("SIGTERM")
        process.exit(0)
    }
})

childProcess.stderr.on("data", (data) => {
    let str = data.toString()
    console.log("swpan stderr:", str)
    if (str.indexOf("Debugger listening") >= 0 ||
        str.indexOf("Warning: Accessing non-existent") >= 0 ||
        str.indexOf("For help") >= 0) {
        return
    }
    // 子进程还在.  ci中没什么影响
    childProcess.kill("SIGTERM")
    process.exit(-1)

})

childProcess.on("close", (v) => {
    console.log("spwan process closed!!", v)
    process.exit(-3)
})
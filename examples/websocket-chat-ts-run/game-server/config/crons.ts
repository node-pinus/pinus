console.log('!!! crons config loaded');

/*

crons  -> time

*     *     *     *   *    *        command to be executed
-     -     -     -   -    -
|     |     |     |   |    |
|     |     |     |   |    +----- day of week (0 - 6) (Sunday=0)
|     |     |     |   +------- month (0 - 11)
|     |     |     +--------- day of month (1 - 31)
|     |     +----------- hour (0 - 23)
|     +------------- min (0 - 59)
+------------- second (0 - 59)


0 30 10 * * * 这就代表每天10:30执行相应任务；serverId是一个可选字段，如果有写该字段则该任务只在该服务器下执行，如果没有该字段则该定时任务在所有同类服务器中执行；action是具体执行任务方法，chatCron.sendMoney则代表执行game-server/app/servers/chat/cron/chatCron.js中的sendMoney方法。

通过pomelo-cli的addCron和removeCron命令可以动态地增加和删除定时任务，其中addCron的必要参数包括：id,action,time；removeCron的必要参数包括：id；serverId和serverType是两者选其一即可。例如：

addCron id=8 'time=0 30 11 * * *' action=chatCron.sendMoney serverId=chat-server-3

removeCron id=8

 */


module.exports = {
    "development": {
        "chat": [
            {
                "id": 'onlineStatus',
                // 5秒一次
                "time": "0/5 * * * * *",
                "action": "cronTest.onlineCron"
            }
        ]
    },
    "production": {
        "chat": [
            { "id": 'onlineStatus', "time": "0/5 * * * * *", "action": "cronTest.onlineCron" }
        ]
    }
};
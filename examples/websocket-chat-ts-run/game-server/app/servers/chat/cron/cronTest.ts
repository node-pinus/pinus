import { Application } from "pinus";

let cronInstance: CronTest

export default function (app) {
    if (cronInstance) {
        return cronInstance
    }
    return cronInstance = new CronTest(app)
}

export class CronTest {
    constructor(app: Application) {
    }

    public async onlineCron() {
        console.log("online cron", Date.now())
    }
}
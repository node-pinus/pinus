import { Injectable } from "@nestjs/common";
import { Application } from "pinus";
import { getNestClass } from "../../../util/nestutil";
import { ChatServerModule } from "../../chat.module";

let cronInstance: CronTest

export default function (app) {
    return getNestClass(app, CronTest, ChatServerModule)
}

@Injectable()
export class CronTest {
    constructor(app: Application) {
    }

    public async onlineCron() {
        console.log("online cron", Date.now())
    }
}
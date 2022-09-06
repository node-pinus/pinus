import { Module } from "@nestjs/common";
import { pinusAppProvider } from "../../util/nestutil";
import { databaseProvider } from "../provider/db.provider";
import { MuteDao } from "./mute.dao";
import { MuteService } from "./mute.service";


@Module({
    imports: [],
    providers: [pinusAppProvider, databaseProvider, MuteDao, MuteService,],
    // 因为外部要用 需要需要导出
    exports: [MuteService],
})
export class MuteModule { }

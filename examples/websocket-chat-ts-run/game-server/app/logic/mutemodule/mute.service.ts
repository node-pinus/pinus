import { Injectable } from "@nestjs/common";
import { MuteDao } from "./mute.dao";


@Injectable()
export class MuteService {
    constructor(
        private readonly muteDao: MuteDao,
    ) {

    }

    public async checkUidMuted(uid: string) {
        return this.muteDao.checkUidMuted(uid)
    }
}
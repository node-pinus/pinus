import { Inject, Injectable } from "@nestjs/common";


@Injectable()
export class MuteDao {
    constructor(
        @Inject("mydatabase")
        private readonly dbConnection: any
    ) {

    }

    public async checkUidMuted(uid: string) {
        console.log("check user has been muted:", uid);
        this.dbConnection.hget()
        if (uid == "abc") {
            return true
        }
        return false
    }
}
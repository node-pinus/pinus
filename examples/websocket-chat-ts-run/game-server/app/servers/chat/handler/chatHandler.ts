import { Application, BackendSession } from 'pinus';
import { Injectable } from '@nestjs/common';
import { getNestClass } from '../../../util/nestutil';
import { MuteService } from '../../../logic/mutemodule/mute.service';


export default function (app: Application) {
    return getNestClass(app, ChatHandler)
}

@Injectable()
export class ChatHandler {
    constructor(
        private app: Application,
        private readonly muteService: MuteService,
    ) {
    }

    /**
     * Send messages to users
     *
     * @param {Object} msg message from client
     * @param {Object} session
     *
     */
    async send(msg: { content: string, target: string }, session: BackendSession) {
        let rid = session.get('rid');
        let username = session.uid.split('*')[0];
        if (this.muteService.checkUidMuted(username)) {
            console.log("user has been muted", username, " chage msg");
            msg.content = "##@ user has been muted## - " + msg.content
        }
        let channelService = this.app.get('channelService');
        let param = {
            msg: msg.content,
            from: username,
            target: msg.target
        };
        let channel = channelService.getChannel(rid, false);

        // the target is all users
        if (msg.target === '*') {
            channel.pushMessage('onChat', param);
        }
        // the target is specific user
        else {
            let tuid = msg.target + '*' + rid;
            let tsid = channel.getMember(tuid)['sid'];
            channelService.pushMessageByUids('onChat', param, [{
                uid: tuid,
                sid: tsid
            }]);
        }
    }
}
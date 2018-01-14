import { Application, ChannelService, bindRemoterMethod, FrontendSession } from 'pinus';

export default function (app: Application) {
    return new ChatRemote(app);
}

// UserRpc的命名空间自动合并
declare global {
    interface UserRpc {
        chat: {
            chatRemote: ChatRemote;
        };
    }
}

export class ChatRemote {

    constructor(private app: Application) {
        this.app = app;
        this.channelService = app.get('channelService');
    }
    // 导出远程调用方法
    add = bindRemoterMethod(this._add, this, FrontendSession);
    kick = bindRemoterMethod(this._kick, this, FrontendSession);

    private channelService: ChannelService;

    /**
     * Add user into chat channel.
     *
     * @param {String} uid unique id for user
     * @param {String} sid server id
     * @param {String} name channel name
     * @param {boolean} flag channel parameter
     *
     */
    private async _add(uid: string, sid: string, name: string, flag: boolean) {
        let channel = this.channelService.getChannel(name, flag);
        let username = uid.split('*')[0];
        let param = {
            user: username
        };
        channel.pushMessage('onAdd' , param);

        if (!!channel) {
            channel.add(uid, sid);
        }

        return this.get(name, flag);
    }

    /**
     * Get user from chat channel.
     *
     * @param {Object} opts parameters for request
     * @param {String} name channel name
     * @param {boolean} flag channel parameter
     * @return {Array} users uids in channel
     *
     */
    private get(name: string, flag: boolean) {
        let users: string[] = [];
        let channel = this.channelService.getChannel(name, flag);
        if (!!channel) {
            users = channel.getMembers();
        }
        for (let i = 0; i < users.length; i++) {
            users[i] = users[i].split('*')[0];
        }
        return users;
    }

    /**
     * Kick user out chat channel.
     *
     * @param {String} uid unique id for user
     * @param {String} sid server id
     * @param {String} name channel name
     *
     */
    private async _kick(uid: string, sid: string, name: string) {
        let channel = this.channelService.getChannel(name, false);
        // leave channel
        if (!!channel) {
            channel.leave(uid, sid);
        }
        let username = uid.split('*')[0];
        let param = {
            user: username
        };
        channel.pushMessage('onLeave' , param);
    }
}
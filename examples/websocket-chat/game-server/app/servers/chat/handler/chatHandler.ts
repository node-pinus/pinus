import { chatRemote } from '../remote/chatRemote';
import { Application } from 'pinus';
import { FrontendSession } from 'pinus';

export default function(app: Application) {
	return new chatHandler(app);
}

export class chatHandler {
	constructor(private app: Application) {
	}

	/**
	 * Send messages to users
	 *
	 * @param {Object} msg message from client
	 * @param {Object} session
	 * @param  {Function} next next stemp callback
	 *
	 */
	async send(msg: {content: string , target: string}, session: FrontendSession) {
		let rid = session.get('rid');
		let username = session.uid.split('*')[0];
		let channelService = this.app.get('channelService');
		let param = {
			msg: msg.content,
			from: username,
			target: msg.target
		};
		let channel = channelService.getChannel(rid, false);

		//the target is all users
		if (msg.target == '*') {
			channel.pushMessage('onChat', param);
		}
		//the target is specific user
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
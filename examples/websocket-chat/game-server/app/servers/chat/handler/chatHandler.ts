import { chatRemote } from '../remote/chatRemote';
import { Application } from 'pinus';
import { FrontendSession } from 'pinus';

export default function(app : Application) {
	return new chatHandler(app);
};

export class chatHandler
{
	constructor(private app : Application)
	{
	};

	/**
	 * Send messages to users
	 *
	 * @param {Object} msg message from client
	 * @param {Object} session
	 * @param  {Function} next next stemp callback
	 *
	 */
	async send(msg: {content : string , target : string}, session : FrontendSession)
	{
		var rid = session.get('rid');
		var username = session.uid.split('*')[0];
		var channelService = this.app.get('channelService');
		var param = {
			msg: msg.content,
			from: username,
			target: msg.target
		};
		var channel = channelService.getChannel(rid, false);

		//the target is all users
		if (msg.target == '*')
		{
			channel.pushMessage('onChat', param);
		}
		//the target is specific user
		else
		{
			var tuid = msg.target + '*' + rid;
			var tsid = channel.getMember(tuid)['sid'];
			channelService.pushMessageByUids('onChat', param, [{
				uid: tuid,
				sid: tsid
			}]);
		}
	};
}
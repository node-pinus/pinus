import { Application } from 'pinus';
import { FrontendSession } from 'pinus';

export default function (app: Application) {
	return new entryHandler(app);
}

export class entryHandler {
	constructor(private app: Application) {
	}


	/**
	 * New client entry chat server.
	 *
	 * @param  {Object}   msg     request message
	 * @param  {Object}   session current session object
	 * @param  {Function} next    next stemp callback
	 * @return {Void}
	 */
	async enter(msg: {rid: string, username: string}, session: FrontendSession) {
		let self = this;
		let rid = msg.rid;
		let uid = msg.username + '*' + rid;
		let sessionService = self.app.get('sessionService');

		//duplicate log in
		if (!!sessionService.getByUid(uid)) {
			return {
				code: 500,
				error: true
			};
		}

		await session.abind(uid);
		session.set('rid', rid);
		session.push('rid', function (err) {
			if (err) {
				console.error('set rid for session service failed! error is : %j', err.stack);
			}
		});
		session.on('closed', this.onUserLeave.bind(this));

		//put user into channel
		let users = await self.app.rpc.chat.chatRemote.add(session, uid, self.app.get('serverId'), rid, true);

		return {
			users: users
		};
	}

	/**
	 * User log out handler
	 *
	 * @param {Object} app current application
	 * @param {Object} session current session object
	 *
	 */
	onUserLeave(session: FrontendSession) {
		if (!session || !session.uid) {
			return;
		}
		this.app.rpc.chat.chatRemote.kick(session, session.uid, this.app.get('serverId'), session.get('rid'), null);
	}
}
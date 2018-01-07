import { dispatch } from '../../../util/dispatcher';
import { Application , BackendSession} from 'pinus';

export default function (app: Application)
{
	return new gateHandler(app);
};

export class gateHandler
{
	constructor(private app: Application) 
	{
	};

	/**
	 * Gate handler that dispatch user to connectors.
	 *
	 * @param {Object} msg message from client
	 * @param {Object} session
	 * @param {Function} next next stemp callback
	 *
	 */
	async queryEntry(msg: {uid : string}, session : BackendSession)
	{
		var uid = msg.uid;
		if (!uid)
		{
			return {
				code: 500
			};
		}
		// get all connectors
		var connectors = this.app.getServersByType('connector');
		if (!connectors || connectors.length === 0)
		{
			return {
				code: 500
			};
		}
		// select connector
		var res = dispatch(uid, connectors);
		return {
			code: 200,
			host: res.host,
			port: res.clientPort
		};
	};
}

import { dispatch} from './dispatcher';
import { Session, Application } from 'pinus';

export function chat(session : Session, msg : any, app : Application, cb : (err : Error , serverId ?: string)=>void) {
	var chatServers = app.getServersByType('chat');

	if(!chatServers || chatServers.length === 0) {
		cb(new Error('can not find chat servers.'));
		return;
	}

	var res = dispatch(session.get('rid'), chatServers);

	cb(null, res.id);
};
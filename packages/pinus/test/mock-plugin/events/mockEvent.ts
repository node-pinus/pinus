import { Application } from '../../../lib/application';
import { Session } from '../../../lib/common/service/sessionService';

class Event
{
	app: Application;
	constructor(app: Application)
	{
		this.app = app;
	}
	bind_session = function (session: Session)
	{
	}
}

export { Event }
import { Application } from '../../../lib/application';
import { Session } from '../../../lib/common/service/sessionService';
import { IApplicationEvent } from '../../../lib/index';

export class mockEvent implements IApplicationEvent
{
	app: Application;
	constructor(app: Application)
	{
		this.app = app;
	}
	bind_session(session: Session)
	{
	}
}
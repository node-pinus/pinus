import { SessionService, SessionServiceOptions } from '../common/service/sessionService';
import { Application } from '../application';
import { IComponent } from '../interfaces/IComponent';


/**
 * Session component. Manage sessions.
 *
 * @param {Object} app  current application context
 * @param {Object} opts attach parameters
 */
export class SessionComponent extends SessionService implements IComponent {
    app: Application;
    constructor(app: Application, opts ?: SessionServiceOptions) {
        super(opts);
        this.app = app;
        app.set('sessionService', this, true);
    }

    name = '__session__';

}
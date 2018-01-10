import { BackendSessionService } from '../common/service/backendSessionService';
import { IComponent } from '../interfaces/IComponent';
import { Application } from '../application';


export class BackendSessionComponent extends BackendSessionService implements IComponent {
  constructor(app: Application) {
    super(app);
    // export backend session service to the application context.
    app.set('backendSessionService', this, true);
  }

  name = '__backendSession__';
}

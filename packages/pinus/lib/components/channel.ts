import { ChannelService, ChannelServiceOptions } from '../common/service/channelService';
import { IComponent } from '../interfaces/IComponent';
import { Application } from '../application';

export class ChannelComponent extends ChannelService implements IComponent {
  constructor(app: Application, opts: ChannelServiceOptions) {
    super(app , opts);
    app.set('channelService', this, true);
  }
  name = '__channel__';
}
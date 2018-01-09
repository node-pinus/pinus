import { Application } from '../../../lib/application';
import { IComponent } from '../../../lib/index';

export class mockPlugin implements IComponent
{
  name = 'mockPlugin';
  constructor(opts: any)
  {
  }
}
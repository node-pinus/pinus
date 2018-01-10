import { Application } from '../../../lib/application';
import { IComponent } from '../../../lib/index';

export class MockPlugin implements IComponent {
  name = 'mockPlugin';
  constructor(opts: any) {
  }
}
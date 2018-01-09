import { Application } from '../../../lib/application';

export function mockPlugin(app: Application, opts: any) {
  var service = {name: 'mockPlugin'};
  return service;
};
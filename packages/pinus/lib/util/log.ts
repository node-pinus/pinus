import * as logger from 'pinus-logger';
import { Application } from '../application';

/**
 * Configure pinus logger
 */
export function configure(app : Application, filename : string) {
  var serverId = app.getServerId();
  var base = app.getBase();
  logger.configure(filename, {serverId: serverId, base: base});
};

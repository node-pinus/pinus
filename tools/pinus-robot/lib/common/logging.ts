/* Generic logging module.
 *
 * Log Levels:
 * - 3 (Debug)
 * - 2 (Info)
 * - 1 (Warn)
 * - 0 (Error)
 */
export class Logger {
  _log_level: number;
  constructor(log_level?: number) {
    this._log_level = log_level ? log_level : 2;
  }
  _timestamp(msg?: string) {
    return (new Date()).toLocaleString().slice(0, 24);
  }

  set(level: number) {
    this._log_level = level;
  }

  debug(msg: string) {
    if (this._log_level < 3) { return; }
    console.info('[' + this._timestamp() + '] DEBUG: ' + msg);
  }

  isDebug(msg: string) {
    if (this._log_level < 3) { return false; } else { return true; }
  }

  info(msg?: string) {
    if (this._log_level < 2) { return; }
    console.info('[' + this._timestamp() + '] INFO: ' + msg);
  }

  warn(msg: string) {
    if (this._log_level < 1) { return; }
    console.warn('[' + this._timestamp() + '] WARN: ' + msg);
  }

  error(msg: string) {
    if (this._log_level < 0) { return; }
    console.error('[' + this._timestamp() + '] ERROR: ' + msg);
  }
}

let instance: Logger = new Logger();

export { instance as logging };

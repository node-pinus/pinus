let util = require('util');
let vm = require('vm');
import { EventEmitter } from 'events'
let monitor = require('../monitor/monitor');
let envConfig = require(process.cwd() + '/app/config/env.json');
let fs = require('fs');
let script = fs.readFileSync(process.cwd() + envConfig.script, 'utf8');
import { logging, Logger } from "../common/logging";

class Actor extends EventEmitter
{
  id: number;
  script: string;
  log: Logger = logging;
  constructor(conf: { script: Array<any> }, aid: number)
  {
    super();
    this.id = aid;
    this.script = conf.script || script;
    this.on('start', (action: string, reqId: string) =>
    {
      monitor.beginTime(action, this.id, reqId);
    });
    this.on('end', (action: string, reqId: string) =>
    {
      monitor.endTime(action, this.id, reqId);
    });
    this.on('incr', function (action: string)
    {
      monitor.incr(action);
    });
    this.on('decr', function (action: string)
    {
      monitor.decr(action);
    });
  }

  run()
  {
    try
    {
      let initSandbox = {
        console: console,
        require: require,
        actor: this,
        setTimeout: setTimeout,
        clearTimeout: clearTimeout,
        setInterval: setInterval,
        clearInterval: clearInterval,
        global: global,
        process: process
      };

      let context = vm.createContext(initSandbox);
      vm.runInContext(script, context);
    } catch (ex)
    {
      this.emit('error', ex.stack);
    }
  };

  /**
   * clear data 
   *
   */
  reset()
  {
    monitor.clear();
  };

  /**
   * wrap setTimeout
   *
   *@param {Function} fn
   *@param {Number} time
   */
  later(fn: (...args: any[]) => void, time: number)
  {
    if (time > 0 && typeof (fn) == 'function')
    {
      return setTimeout(fn, time);
    }
  };

  /**
   * wrap setInterval 
   * when time is Array, the interval time is thd random number
   * between then
   * 
   *@param {Function} Fn
   *@param {Number} time
   */
  interval(Fn: Function, time: any)
  {
    let fn = arguments[0];
    let self = this;
    switch (typeof (time))
    {
      case 'number':
        if (arguments[1] > 0) return setInterval(fn, arguments[1]);
        break;
      case 'object':
        let start = time[0], end = time[1];
        let newTime: number = Math.round(Math.random() * (end - start) + start);
        return setTimeout(function () { fn(), self.interval(fn, newTime); }, newTime);
      default:
        self.log.error('wrong argument');
        return;
    }
  };

  /**
   *wrap clearTimeout
   *
   * @param {Number} timerId
   *
   */
  clean(timerId: NodeJS.Timer)
  {
    clearTimeout(timerId);
  }

  /**
   *encode message
   *
   * @param {Number} id
   * @param {Object} msg
   *
   */
}

export { Actor };

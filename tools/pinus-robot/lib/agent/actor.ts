import * as util  from 'util';
import * as  vm  from 'vm';
import { EventEmitter } from 'events';
import * as  monitor  from '../monitor/monitor';
import * as  fs  from 'fs';
import * as  path  from 'path';
import { logging, Logger } from '../common/logging';
import { AgentCfg } from './agent';


export interface IActor {
    id: number;

    emit(type: 'start' | 'end' , action: string , reqId: string): void;
    emit(type: 'incr' | 'decr' , action: string): void;
}

export class Actor extends EventEmitter implements IActor {
  id: number;
  script: string;
  log: Logger = logging;
  constructor(conf: AgentCfg, aid: number) {
    super();
    this.id = aid;
    if (conf.script) {
      this.script = conf.script;
    }
    else {
     if(path.isAbsolute(conf.scriptFile)) {
      this.script = `require("${conf.scriptFile}").default(actor);`;
     }
     else {
      this.script = `require("${path.join(process.cwd() , conf.scriptFile)}").default(actor);`;
     }
    }
    console.log('runScript ' , this.script);
    this.on('start', (action: string, reqId: number) => {
      monitor.beginTime(action, this.id, reqId);
    });
    this.on('end', (action: string, reqId: number) => {
      monitor.endTime(action, this.id, reqId);
    });
    this.on('incr', function (action: string) {
      monitor.incr(action);
    });
    this.on('decr', function (action: string) {
      monitor.decr(action);
    });
  }


  run() {
    try {
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
      vm.runInContext(this.script, context);
    } catch (ex) {
      this.emit('error', ex.stack);
    }
  }

  /**
   * clear data
   *
   */
  reset() {
    monitor.clear();
  }

  /**
   * wrap setTimeout
   *
   *@param {Function} fn
   *@param {Number} time
   */
  later(fn: (...args: any[]) => void, time: number) {
    if (time > 0 && typeof (fn) === 'function') {
      return setTimeout(fn, time);
    }
  }

  /**
   * wrap setInterval
   * when time is Array, the interval time is thd random number
   * between then
   *
   *@param {Function} Fn
   *@param {Number} time
   */
  interval(Fn: Function, time: any) {
    let fn = arguments[0];
    let self = this;
    switch (typeof (time)) {
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
  }

  /**
   *wrap clearTimeout
   *
   * @param {Number} timerId
   *
   */
  clean(timerId: NodeJS.Timer) {
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


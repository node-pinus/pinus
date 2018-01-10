/**
 * Component for monitor.
 * Load and start monitor client.
 */
import { Monitor, MonitorOptions } from '../monitor/monitor';
import { IComponent } from '../interfaces/IComponent';
import { Application } from '../application';
import { MasterInfo } from '../index';



export class MonitorComponent implements IComponent {
    monitor: Monitor;
    constructor(app: Application, opts ?: MonitorOptions) {
        this.monitor = new Monitor(app, opts);
    }

    name = '__monitor__';
    start(cb: () => void) {
        this.monitor.start(cb);
    }

    stop(force: boolean, cb: () => void) {
        this.monitor.stop(cb);
    }

    reconnect(masterInfo: MasterInfo) {
        this.monitor.reconnect(masterInfo);
    }
}
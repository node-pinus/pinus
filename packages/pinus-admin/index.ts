import * as fs from 'fs';
import { IModuleFactory } from './lib/consoleService';
import { MonitorLogModule } from './lib/modules/monitorLog';
import { NodeInfoModule } from './lib/modules/nodeInfo';
import { ProfilerModule } from './lib/modules/profiler';
import { ScriptsModule } from './lib/modules/scripts';
import { SystemInfoModule } from './lib/modules/systemInfo';
export * from './lib/consoleService';

export * from './lib/client/client';
export * from './lib/monitor/monitorAgent';
export * from './lib/master/masterAgent';

export let modules = {
    monitorLog : MonitorLogModule,
    nodeInfo : NodeInfoModule,
    profiler : ProfilerModule,
    scripts : ScriptsModule,
    systemInfo : SystemInfoModule
};

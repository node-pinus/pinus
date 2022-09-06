import { Module } from '@nestjs/common';
import { pinusAppProvider } from '../util/nestutil';
import { GateHandler } from './gate/handler/gateHandler';

@Module({
    imports: [],
    controllers: [],
    providers: [pinusAppProvider, GateHandler],
    exports: [GateHandler],
})
export class GateServerModule { }
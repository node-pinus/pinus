import { Module } from '@nestjs/common';
import { pinusAppProvider } from '../util/nestutil';
import { EntryHandler } from './connector/handler/entryHandler';

@Module({
    imports: [],
    controllers: [],
    providers: [pinusAppProvider, EntryHandler],
    exports: [EntryHandler],
})
export class ConnectorServerModule { }
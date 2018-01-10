/*!
 * Pinus
 * Copyright(c) 2012 xiechengchao <xiecc@163.com>
 * MIT Licensed
 */

/**
 * Module dependencies.
 */
import * as fs from 'fs';
import * as path from 'path';
import { Application, ApplicationOptions } from './application';
import { isFunction } from 'util';
import { BackendSession } from './common/service/backendSessionService';
import { HybridConnector } from './connectors/hybridconnector';
import { UDPConnector } from './connectors/udpconnector';
import { MQTTConnector } from './connectors/mqttconnector';
import { SIOConnector } from './connectors/sioconnector';
import { DirectPushScheduler } from './pushSchedulers/direct';
import { BufferPushScheduler } from './pushSchedulers/buffer';
import { ChannelService } from './common/service/channelService';

import { ConnectionComponent } from './components/connection';
import { ConnectorComponent } from './components/connector';
import { DictionaryComponent } from './components/dictionary';
import { MasterComponent } from './components/master';
import { MonitorComponent } from './components/monitor';
import { ProtobufComponent } from './components/protobuf';
import { ProxyComponent } from './components/proxy';
import { PushSchedulerComponent } from './components/pushScheduler';
import { RemoteComponent } from './components/remote';
import { ServerComponent } from './components/server';
import {SessionComponent } from './components/session';


import { RpcToobusyFilter } from './filters/rpc/toobusy';
import { RpcLogFilter } from './filters/rpc/rpcLog';
import { ToobusyFilter } from './filters/handler/toobusy';
import { TimeFilter } from './filters/handler/time';
import { SerialFilter } from './filters/handler/serial';
import { TimeoutFilter } from './filters/handler/timeout';
let Package = require('../../package');

import {default as events} from './util/events';
import { BackendSessionComponent } from './components/backendSession';
import { ChannelComponent } from './components/channel';
/**
 * Expose `createApplication()`.
 *
 * @module
 */

export class Pinus {
    private _app: Application;
    /**
     * Framework version.
     */

    version = Package.version;

    /**
     * Event definitions that would be emitted by app.event
     */
    events = events;

    /**
     * auto loaded components
     */
    components =
    {
        backendSession : BackendSessionComponent,
        channel : ChannelComponent,
        connection : ConnectionComponent,
        connector : ConnectorComponent,
        dictionary : DictionaryComponent,
        master : MasterComponent,
        monitor : MonitorComponent,
        protobuf : ProtobufComponent,
        proxy : ProxyComponent,
        pushScheduler : PushSchedulerComponent,
        remote : RemoteComponent,
        server : ServerComponent,
        session : SessionComponent,
    };

    /**
     * auto loaded filters
     */
    filters =
    {
        serial : SerialFilter,
        time : TimeFilter,
        timeout : TimeoutFilter,
        toobusy : ToobusyFilter,
    };

    /**
     * auto loaded rpc filters
     */
    rpcFilters =
     {
        rpcLog : RpcLogFilter,
        toobusy : RpcToobusyFilter,
    };


    /**
     * connectors
     */
    connectors =
     {
        sioconnector : SIOConnector,
        hybridconnector : HybridConnector,
        udpconnector : UDPConnector,
        mqttconnector : MQTTConnector,
    };

    /**
     * pushSchedulers
     */
    pushSchedulers =
    {
        direct : DirectPushScheduler,
        buffer : BufferPushScheduler,
    };

    constructor() {
    }

    /**
     * Create an pinus application.
     *
     * @return {Application}
     * @memberOf Pinus
     * @api public
     */
    createApp(opts ?: ApplicationOptions) {
        let app = new Application();
        app.init(opts);
        this._app = app;
        return app;
    }

    /**
     * Get application
     */
    get app() {
        return this._app;
    }
}

export let pinus = new Pinus();
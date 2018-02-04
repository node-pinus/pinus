
import {default as AppEvents} from '../util/events';
import { ServerInfo } from '../util/constants';
import { ObjectType } from './define';
import { ILifeCycle } from './ILifeCycle';
import { IComponent } from './IComponent';
import { Cron } from '../server/server';
import { Session } from '../index';
import { Application } from '../application';

export interface ComponentContructor {
    new(app: Application, opts ?: any): IComponent;
}

export interface IApplicationEvent {
    add_servers ?: (servers: ServerInfo[]) => void;
    remove_servers ?: (servers: ServerInfo[]) => void;
    replace_servers ?: (servers: ServerInfo[]) => void;
    bind_session ?: (session: Session) => void;
    unbind_session ?: (session: Session) => void;
    close_session ?: (session: Session) => void;
    add_crons ?: (crons: Cron[]) => void;
    remove_crons ?: (crons: Cron[]) => void;
    start_server ?: (serverId: string) => void;
    start_all ?: () => void;
}

export interface ApplicationEventContructor {
    new(opts ?: any): IApplicationEvent;
}

/**
 * 一个pinus插件
 */
export interface IPlugin extends ILifeCycle {
    /**
     * 插件的名称
     */
    name: string;

    /**
     * 启动插件时需要自动加载的组件
     */
    components ?: ComponentContructor[];

    /**
     * 启动插件时需要侦听的应用程序事件
     */
    events ?: ApplicationEventContructor[];

    /**
     * 插件暴漏的handler所在的路径
     */
    handlerPath ?: string;

    /**
     * 插件暴漏的remoters所在的路径
     */
    remoterPath?: string;

    /**
     * 插件暴漏的crons所在的路径
     */
    cronPath ?: string;
}
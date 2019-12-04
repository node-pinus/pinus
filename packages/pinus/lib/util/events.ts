export enum AppEvents {
    ADD_SERVERS= 'add_servers',
    REMOVE_SERVERS= 'remove_servers',
    REPLACE_SERVERS= 'replace_servers',
    BIND_SESSION= 'bind_session',
    UNBIND_SESSION= 'unbind_session',
    CLOSE_SESSION= 'close_session',
    ADD_CRONS= 'add_crons',
    REMOVE_CRONS= 'remove_crons',
    START_SERVER= 'start_server',
    START_ALL= 'start_all',
    // ProtobufComponent 组件，当协议文件热更新时 通知  参数： type(server|client)
    PROTO_CHANGED= 'proto_changed',
}
export default AppEvents;
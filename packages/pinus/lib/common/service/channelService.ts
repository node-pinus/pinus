import * as countDownLatch from '../../util/countDownLatch';
import * as utils from '../../util/utils';
import { ChannelRemote } from '../remote/frontend/channelRemote';
import { getLogger } from 'pinus-logger'; import { Application } from '../../application';
import { IComponent } from '../../interfaces/IComponent';
import { IStore } from '../../interfaces/IStore';
import { IHandlerFilter } from '../../interfaces/IHandlerFilter';
import { FRONTENDID, UID, SID } from '../../util/constants';
import * as path from 'path';
let logger = getLogger('pinus', path.basename(__filename));

/**
 * constant
 */
let ST_INITED = 0;
let ST_DESTROYED = 1;

export interface ChannelServiceOptions {
    prefix ?: string;
    store ?: IStore;
    broadcastFilter ?: IHandlerFilter;
}

/**
 * Create and maintain channels for server local.
 *
 * ChannelService is created by channel component which is a default loaded
 * component of pinus and channel service would be accessed by `app.get('channelService')`.
 *
 * @class
 * @constructor
 */
export class ChannelService implements IComponent {
    app: Application;
    channels: { [key: string]: Channel };
    prefix: string;
    store: IStore;
    broadcastFilter: any;
    channelRemote: ChannelRemote;
    name: string;

    constructor(app: Application, opts ?: ChannelServiceOptions) {
        opts = opts || {};
        this.app = app;
        this.channels = {};
        this.prefix = opts.prefix;
        this.store = opts.store;
        this.broadcastFilter = opts.broadcastFilter;
        this.channelRemote = new ChannelRemote(app);
    }


    start(cb: (err?: Error) => void) {
        restoreChannel(this, cb);
    }



    /**
     * Create channel with name.
     *
     * @param {String} name channel's name
     * @memberOf ChannelService
     */
    createChannel(name: string) {
        if (this.channels[name]) {
            return this.channels[name];
        }

        let c = new Channel(name, this);
        addToStore(this, genKey(this), genKey(this, name));
        this.channels[name] = c;
        return c;
    }

    /**
     * Get channel by name.
     *
     * @param {String} name channel's name
     * @param {Boolean} create if true, create channel
     * @return {Channel}
     * @memberOf ChannelService
     */
    getChannel(name: string, create ?: boolean) {
        let channel = this.channels[name];
        if (!channel && !!create) {
            channel = this.channels[name] = new Channel(name, this);
            addToStore(this, genKey(this), genKey(this, name));
        }
        return channel;
    }

    /**
     * Destroy channel by name.
     *
     * @param {String} name channel name
     * @memberOf ChannelService
     */
    destroyChannel(name: string) {
        delete this.channels[name];
        removeFromStore(this, genKey(this), genKey(this, name));
        removeAllFromStore(this, genKey(this, name));
    }

    /**
     * Push message by uids.
     * Group the uids by group. ignore any uid if sid not specified.
     *
     * @param {String} route message route
     * @param {Object} msg message that would be sent to client
     * @param {Array} uids the receiver info list, [{uid: userId, sid: frontendServerId}]
     * @param {Object} opts user-defined push options, optional
     * @param {Function} cb cb(err)
     * @memberOf ChannelService
     */
    pushMessageByUids(route: string, msg: any, uids: {uid: string, sid: string}[], cb ?: (err ?: Error , result ?: void) => void): void;
    pushMessageByUids(route: string, msg: any, uids: {uid: string, sid: string}[], opts?: any, cb ?: (err ?: Error , result ?: void) => void) {
        if (typeof route !== 'string') {
            cb = opts;
            opts = uids;
            uids = msg;
            msg = route;
            route = msg.route;
        }

        if (!cb && typeof opts === 'function') {
            cb = opts;
            opts = {};
        }

        if (!uids || uids.length === 0) {
            utils.invokeCallback(cb);
            return;
        }
        let groups = {}, record;
        for (let i = 0, l = uids.length; i < l; i++) {
            record = uids[i];
            add(record.uid, record.sid, groups);
        }

        sendMessageByGroup(this, route, msg, groups, opts, cb);
    }

    /**
     * Broadcast message to all the connected clients.
     *
     * @param  {String}   stype      frontend server type string
     * @param  {String}   route      route string
     * @param  {Object}   msg        message
     * @param  {Object}   opts       user-defined broadcast options, optional
     *                               opts.binded: push to binded sessions or all the sessions
     *                               opts.filterParam: parameters for broadcast filter.
     * @param  {Function} cb         callback
     * @memberOf ChannelService
     */
    broadcast(stype: string, route: string, msg: any, cb ?: (err ?: Error , result ?: void) => void): void;
    broadcast(stype: string, route: string, msg: any, opts?: any, cb ?: (err ?: Error , result ?: void) => void) {
        let app = this.app;
        let namespace = 'sys';
        let service = 'channelRemote';
        let method = 'broadcast';
        let servers = app.getServersByType(stype);

        if (!servers || servers.length === 0) {
            // server list is empty
            utils.invokeCallback(cb);
            return;
        }
        if (!cb && typeof opts === 'function') {
            cb = opts;
            opts = undefined;
        }
        let count = servers.length;
        let successFlag = false;

        let latch = countDownLatch.createCountDownLatch(count, function () {
            if (!successFlag) {
                utils.invokeCallback(cb, new Error('broadcast fails'));
                return;
            }
            utils.invokeCallback(cb, null);
        });

        let genCB = function (serverId ?: string) {
            return function (err: Error) {
                if (err) {
                    logger.error('[broadcast] fail to push message to serverId: ' + serverId + ', err:' + err.stack);
                    latch.done();
                    return;
                }
                successFlag = true;
                latch.done();
            };
        };

        opts = { type: 'broadcast', userOptions: opts || {} };

        // for compatiblity
        opts.isBroadcast = true;
        if (opts.userOptions) {
            opts.binded = opts.userOptions.binded;
            opts.filterParam = opts.userOptions.filterParam;
        }

        let self = this;
        let sendMessage = function (serverId: string) {
            return (function () {
                if (serverId === app.serverId) {
                    (self.channelRemote as any)[method](route, msg, opts, genCB());
                } else {
                    app.rpcInvoke(serverId, {
                        namespace: namespace, service: service,
                        method: method, args: [route, msg, opts]
                    }, genCB(serverId));
                }
            }());
        };

        for (let i = 0, l = count; i < l; i++) {
            sendMessage(servers[i].id);
        }
    }

    apushMessageByUids: (route: string, msg: any, uids: {uid: string, sid: string}[], opts?: Object) => Promise<void> = utils.promisify(this.pushMessageByUids);
    abroadcast: (stype: string, route: string, msg: any, opts?: any) => Promise<void> = utils.promisify(this.broadcast);
}
/**
 * Channel maintains the receiver collection for a subject. You can
 * add users into a channel and then broadcast message to them by channel.
 *
 * @class channel
 * @constructor
 */
export class Channel {
    name: string;
    groups: { [sid: string]: string[] };
    records: { [key: string]: {sid: string, uid: string} };
    __channelService__: ChannelService;
    state: number;
    userAmount: number;

    constructor(name: string, service: ChannelService) {
        this.name = name;
        this.groups = {};       // group map for uids. key: sid, value: [uid]
        this.records = {};      // member records. key: uid
        this.__channelService__ = service;
        this.state = ST_INITED;
        this.userAmount = 0;
    }

    /**
     * Add user to channel.
     *
     * @param {Number} uid user id
     * @param {String} sid frontend server id which user has connected to
     */
    add(uid: string, sid: string) {
        if (this.state > ST_INITED) {
            return false;
        } else {
            let res = add(uid, sid, this.groups);
            if (res) {
                this.records[uid] = { sid: sid, uid: uid };
                this.userAmount = this.userAmount + 1;
                addToStore(this.__channelService__, genKey(this.__channelService__, this.name), genValue(sid, uid));
            }
            return res;
        }
    }

    /**
     * Remove user from channel.
     *
     * @param {Number} uid user id
     * @param {String} sid frontend server id which user has connected to.
     * @return [Boolean] true if success or false if fail
     */
    leave(uid: UID, sid: FRONTENDID) {
        if (!uid || !sid) {
            return false;
        }
        let res = deleteFrom(uid, sid, this.groups[sid]);
        if (res) {
            delete this.records[uid];
            this.userAmount = this.userAmount - 1;
            removeFromStore(this.__channelService__, genKey(this.__channelService__, this.name), genValue(sid, uid));
        }
        if (this.userAmount < 0) this.userAmount = 0; // robust
        if (this.groups[sid] && this.groups[sid].length === 0) {
            delete this.groups[sid];
        }
        return res;
    }
    /**
     * Get channel UserAmount in a channel.
     *
     * @return {number } channel member amount
     */
    getUserAmount() {
        return this.userAmount;
    }

    /**
     * Get channel members.
     *
     * <b>Notice:</b> Heavy operation.
     *
     * @return {Array} channel member uid list
     */
    getMembers() {
        let res = [], groups = this.groups;
        let group, i, l;
        for (let sid in groups) {
            group = groups[sid];
            for (i = 0, l = group.length; i < l; i++) {
                res.push(group[i]);
            }
        }
        return res;
    }

    /**
     * Get Member info.
     *
     * @param  {String} uid user id
     * @return {Object} member info
     */
    getMember(uid: UID) {
        return this.records[uid];
    }

    /**
     * Remove member by uid
     * @param uid member to removed
     */
    removeMember(uid: UID) {
        let member = this.getMember(uid);
        if (member)
            return this.leave(member.uid, member.sid);
        else
            return false;
    }

    /**
     * Destroy channel.
     */
    destroy() {
        this.state = ST_DESTROYED;
        this.__channelService__.destroyChannel(this.name);
    }

    /**
     * Push message to all the members in the channel
     *
     * @param {String} route message route
     * @param {Object} msg message that would be sent to client
     * @param {Object} opts user-defined push options, optional
     * @param {Function} cb callback function
     */
    pushMessage(route: string, msg: any, opts ?: any, cb ?: (err: Error | null , result ?: void) => void) {
        if (this.state !== ST_INITED) {
            utils.invokeCallback(cb , new Error('channel is not running now'));
            return;
        }

        if (typeof route !== 'string') {
            cb = opts;
            opts = msg;
            msg = route;
            route = msg.route;
        }

        if (!cb && typeof opts === 'function') {
            cb = opts;
            opts = {};
        }

        sendMessageByGroup(this.__channelService__, route, msg, this.groups, opts, cb);
    }

    apushMessage: (route: string, msg: any, opts ?: any) => Promise<void> = utils.promisify(this.pushMessage);
}
/**
 * add uid and sid into group. ignore any uid that uid not specified.
 *
 * @param uid user id
 * @param sid server id
 * @param groups {Object} grouped uids, , key: sid, value: [uid]
 */
let add = function (uid: UID, sid: FRONTENDID, groups: {[sid: string]: UID[]}) {
    if (!sid) {
        logger.warn('ignore uid %j for sid not specified.', uid);
        return false;
    }

    let group = groups[sid];
    if (!group) {
        group = [];
        groups[sid] = group;
    }

    group.push(uid);
    return true;
};

/**
 * delete element from array
 */
let deleteFrom = function (uid: UID, sid: FRONTENDID, group: UID[]) {
    if (!uid || !sid || !group) {
        return false;
    }

    for (let i = 0, l = group.length; i < l; i++) {
        if (group[i] === uid) {
            group.splice(i, 1);
            return true;
        }
    }

    return false;
};

/**
 * push message by group
 *
 * @param route {String} route route message
 * @param msg {Object} message that would be sent to client
 * @param groups {Object} grouped uids, , key: sid, value: [uid]
 * @param opts {Object} push options
 * @param cb {Function} cb(err)
 *
 * @api private
 */
let sendMessageByGroup = function (channelService: ChannelService, route: string, msg: any, groups: {[sid: string]: UID[]}, opts: any, cb: Function) {
    let app = channelService.app;
    let namespace = 'sys';
    let service = 'channelRemote';
    let method = 'pushMessage';
    let count = utils.size(groups);
    let successFlag = false;
    let failIds: SID[] = [];

    logger.debug('[%s] channelService sendMessageByGroup route: %s, msg: %j, groups: %j, opts: %j', app.serverId, route, msg, groups, opts);
    if (count === 0) {
        // group is empty
        utils.invokeCallback(cb);
        return;
    }

    let latch = countDownLatch.createCountDownLatch(count, function () {
        if (!successFlag) {
            utils.invokeCallback(cb, new Error('all uids push message fail'));
            return;
        }
        utils.invokeCallback(cb, null, failIds);
    });

    let rpcCB = function (serverId: string) {
        return function (err: Error, fails: SID[]) {
            if (err) {
                logger.error('[pushMessage] fail to dispatch msg to serverId: ' + serverId + ', err:' + err.stack);
                latch.done();
                return;
            }
            if (fails) {
                failIds = failIds.concat(fails);
            }
            successFlag = true;
            latch.done();
        };
    };

    opts = { type: 'push', userOptions: opts || {} };
    // for compatiblity
    opts.isPush = true;

    let sendMessage = function (sid: FRONTENDID) {
        return (function () {
            if (sid === app.serverId) {
                (channelService.channelRemote as any)[method](route, msg, groups[sid], opts, rpcCB(sid));
            } else {
                app.rpcInvoke(sid, {
                    namespace: namespace, service: service,
                    method: method, args: [route, msg, groups[sid], opts]
                }, rpcCB(sid));
            }
        })();
    };

    let group;
    for (let sid in groups) {
        group = groups[sid];
        if (group && group.length > 0) {
            sendMessage(sid);
        } else {
            // empty group
            process.nextTick(rpcCB(sid));
        }
    }
};

let restoreChannel = function (self: ChannelService, cb: Function) {
    if (!self.store) {
        utils.invokeCallback(cb);
        return;
    } else {
        loadAllFromStore(self, genKey(self), function (err: Error, list) {
            if (!!err) {
                utils.invokeCallback(cb, err);
                return;
            } else {
                if (!list.length || !Array.isArray(list)) {
                    utils.invokeCallback(cb);
                    return;
                }
                let load = function (key: string , name: string) {
                    return (function () {
                        let channelName = name;
                        loadAllFromStore(self, key, function (err, items) {
                            for (let j = 0; j < items.length; j++) {
                                let array = items[j].split(':');
                                let sid = array[0];
                                let uid = array[1];
                                let channel = self.channels[channelName];
                                let res = add(uid, sid, channel.groups);
                                if (res) {
                                    channel.records[uid] = { sid: sid, uid: uid };
                                }
                            }
                        });
                    })();
                };

                for (let i = 0; i < list.length; i++) {
                    let name = list[i].slice(genKey(self).length + 1);
                    self.channels[name] = new Channel(name, self);
                    load(list[i] , name);
                }
                utils.invokeCallback(cb);
            }
        });
    }
};

let addToStore = function (self: ChannelService, key: string,  value: string) {
    if (!!self.store) {
        self.store.add(key, value, function (err) {
            if (!!err) {
                logger.error('add key: %s value: %s to store, with err: %j', key, value, err);
            }
        });
    }
};

let removeFromStore = function (self: ChannelService, key: string,  value: string) {
    if (!!self.store) {
        self.store.remove(key, value, function (err) {
            if (!!err) {
                logger.error('remove key: %s value: %s from store, with err: %j', key, value, err);
            }
        });
    }
};

let loadAllFromStore = function (self: ChannelService, key: string, cb: (err: Error , list: string[]) => void) {
    if (!!self.store) {
        self.store.load(key, function (err, list) {
            if (!!err) {
                logger.error('load key: %s from store, with err: %j', key, err);
                utils.invokeCallback(cb, err);
            } else {
                utils.invokeCallback(cb, null, list);
            }
        });
    }
};

let removeAllFromStore = function (self: ChannelService, key: string) {
    if (!!self.store) {
        self.store.removeAll(key, function (err) {
            if (!!err) {
                logger.error('remove key: %s all members from store, with err: %j', key, err);
            }
        });
    }
};

let genKey = function (self: ChannelService, name ?: string) {
    if (!!name) {
        return self.prefix + ':' + self.app.serverId + ':' + name;
    } else {
        return self.prefix + ':' + self.app.serverId;
    }
};

let genValue = function (sid: FRONTENDID, uid: UID) {
    return sid + ':' + uid;
};

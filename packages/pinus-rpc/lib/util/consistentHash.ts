import * as crypto from 'crypto';
import { RpcServerInfo } from '../rpc-client/mailstation';


let getKeysLength = function<T>(map: {[key: string]: T}) {
    return Object.keys(map).length;
};

let hash = function (algorithm: string, str: string) {
    return crypto.createHash(algorithm).update(str).digest('hex');
};

let compare = function (v1: string, v2: string): number {
    return v1 > v2 ? 1 : v1 < v2 ? -1 : 0;
};
export class ConsistentHash {

    ring: {[key: string]: any} = {};
    keys: {[key: string]: any} = [];
    nodes: Array<RpcServerInfo> = [];
    opts: any;
    replicas: number;
    algorithm: string;
    station: any;

    constructor(nodes: Array<RpcServerInfo>, opts: any) {
        this.opts = opts || {};
        this.replicas = this.opts.replicas || 100;
        this.algorithm = this.opts.algorithm || 'md5';
        this.station = this.opts.station;

        for (let i = 0; i < nodes.length; i++) {
            this.addNode(nodes[i]);
        }

        this.station.on('addServer', this.addNode.bind(this));
        this.station.on('removeServer', this.removeNode.bind(this));
    }


    addNode(node: RpcServerInfo) {
        this.nodes.push(node);
        for (let i = 0; i < this.replicas; i++) {
            let key = hash(this.algorithm, (node.id || node) + ':' + i);
            this.keys.push(key);
            this.ring[key] = node;
        }
        this.keys.sort();
    }

    removeNode(node: RpcServerInfo) {
        for (let i = 0; i < this.nodes.length; i++) {
            if (this.nodes[i] === node) {
                this.nodes.splice(i, 1);
                i--;
            }
        }

        for (let j = 0; j < this.replicas; j++) {
            let key = hash(this.algorithm, (node.id || node) + ':' + j);
            delete this.ring[key];
            for (let k = 0; k < this.keys.length; k++) {
                if (this.keys[k] === key) {
                    this.keys.splice(k, 1);
                    k--;
                }
            }
        }
    }

    getNode(key: string) {
        if (getKeysLength(this.ring) === 0) {
            return 0;
        }
        let result = hash(this.algorithm, key);
        let pos = this.getNodePosition(result);
        return this.ring[this.keys[pos]];
    }

    getNodePosition(result: string) {
        let upper = getKeysLength(this.ring) - 1;
        let lower = 0;
        let idx = 0;
        let comp = 0;

        if (upper === 0) {
            return 0;
        }

        // binary search
        while (lower <= upper) {
            idx = Math.floor((lower + upper) / 2);
            comp = compare(this.keys[idx], result);

            if (comp === 0) {
                return idx;
            } else if (comp > 0) {
                upper = idx - 1;
            } else {
                lower = idx + 1;
            }
        }

        if (upper < 0) {
            upper = getKeysLength(this.ring) - 1;
        }

        return upper;
    }
}
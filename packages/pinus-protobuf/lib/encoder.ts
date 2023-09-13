import * as codec from './codec';
import * as constant from './constant';
import * as util from './util';
import { checkMsgValid } from './util';

export class Encoder {
    protos: any;

    private readonly _encodeCache: Buffer;

    constructor(protos: any, encoderCacheSize?: number) {
        this.init(protos);
        if (encoderCacheSize) {
            this._encodeCache = Buffer.alloc(encoderCacheSize);
        }
    }

    init(protos: any) {
        this.protos = protos || {};
    }

    encode(route: string, msg: { [key: string]: any }) {
        if (!route || !msg) {
            console.warn('Route or msg can not be null! route : %j, msg %j', route, msg);
            return null;
        }

        // Get protos from protos map use the route as key
        let protos = this.protos[route];

        // Check msg
        if (!this.checkMsg(msg, protos)) {
            console.error('check msg failed! msg : %j, proto : %j', msg, protos);
            return null;
        }

        let buffer = this._encodeCache;
        if (!buffer) {
            // Set the length of the buffer 2 times bigger to prevent overflow
            let length = Buffer.byteLength(JSON.stringify(msg)) * 2;

            // Init buffer and offset
            buffer = Buffer.alloc(length);
        }
        let offset = 0;

        if (!!protos) {
            offset = this.encodeMsg(buffer, offset, protos, msg);
            if (offset > 0) {
                return buffer.slice(0, offset);
            }
        }

        return null;
    }

    /**
     * Check if the msg follow the defination in the protos
     */
    checkMsg(msg: { [key: string]: any }, protos: { [key: string]: any }) {
        return checkMsgValid(msg, protos, this.protos)
    }

    encodeMsg(buffer: Buffer, offset: number, protos: { [key: string]: any }, msg: { [key: string]: any }) {
        if(msg instanceof Map) {
            for(const [key, value] of msg) {
                if (!!protos[key]) {
                    let proto = protos[key];
                    offset = this._encodeMsg(buffer, offset, protos, proto, value);
                }
            }
        } else {
            for (let name in msg) {
                if (!!protos[name]) {
                    let proto = protos[name];
                    offset = this._encodeMsg(buffer, offset, protos, proto, msg[name]);
                }
            }
        }
        return offset;
    }

    _encodeMsg(buffer: Buffer, offset: number, protos: { [key: string]: any }, proto: any, value: any) {
            switch (proto.option) {
                case 'required':
                case 'optional':
                    offset = this.writeBytes(buffer, offset, this.encodeTag(proto.type, proto.tag));
                    offset = this.encodeProp(value, proto.type, offset, buffer, protos);
                    break;
                case 'repeated':
                    if (!!value && value.length > 0) {
                        offset = this.encodeArray(value, proto, offset, buffer, protos);
                    }
                    break;
                case 'map':
                    if(!!value) {
                        offset = this.encodeMap(value, proto, offset, buffer, protos);
                    };
                    break;
                case 'obj':
                    if(!!value) {
                        offset = this.encodeObject(value, proto, offset, buffer, protos);
                    };
                    break;
            }
            return offset;
        }


    encodeProp(value: any, type: string, offset: number, buffer: Buffer, protos ?: { [key: string]: any }) {
        let length = 0;

        switch (type) {
            case 'uInt32':
                offset = this.writeBytes(buffer, offset, codec.encodeUInt32(value));
                break;
            case 'int32':
            case 'sInt32':
                offset = this.writeBytes(buffer, offset, codec.encodeSInt32(value));
                break;
            case 'float':
                buffer.writeFloatLE(value, offset);
                offset += 4;
                break;
            case 'double':
                buffer.writeDoubleLE(value, offset);
                offset += 8;
                break;
            case 'string':
                length = Buffer.byteLength(value);

                // Encode length
                offset = this.writeBytes(buffer, offset, codec.encodeUInt32(length));
                // write string
                buffer.write(value, offset, length);
                offset += length;
                break;
            case 'bool':
                const intValue = value ? 1 : 0;
                offset = this.writeBytes(buffer, offset, codec.encodeUInt32(intValue));
                break;
                break;
            default:
                let message: { [key: string]: any } = protos.__messages[type] || this.protos['message ' + type];
                if (!!message) {
                    if (this._encodeCache) {
                        let lengthOffset = offset;
                        // 先预留1字节的长度位置  一般的消息都是小于128字节的.
                        // 大于128字节就copy数据. 原来的逻辑本来就需要copy所以对性能只有提升,没有降低
                        offset += 1;
                        offset = this.encodeMsg(buffer, offset, message, value);
                        let msgLength = offset - lengthOffset - 1;
                        let lenBytes = codec.encodeUInt32(msgLength);
                        if (lenBytes.length === 1) {
                            buffer[lengthOffset] = lenBytes[0];
                        } else {
                            let moveSize = lenBytes.length - 1;
                            offset += moveSize
                            for (let i = offset - 1; i >= lengthOffset + 1; i--) {
                                buffer[i] = buffer[i - moveSize];
                            }
                            this.writeBytes(buffer, lengthOffset, lenBytes);
                        }
                        break;
                    }
                    // Use a tmp buffer to build an internal msg
                    let tmpBuffer = Buffer.alloc(Buffer.byteLength(JSON.stringify(value)) * 2);
                    length = 0;

                    length = this.encodeMsg(tmpBuffer, length, message, value);
                    // Encode length
                    offset = this.writeBytes(buffer, offset, codec.encodeUInt32(length));
                    // contact the object
                    tmpBuffer.copy(buffer, offset, 0, length);

                    offset += length;
                }
                break;
        }

        return offset;
    }

    /**
     * Encode reapeated properties, simple msg and object are decode differented
     */
    encodeArray(array: Array < number > , proto: { [key: string]: any }, offset: number, buffer: Buffer, protos: { [key: string]: any }) {
        let i = 0;
        if (util.isSimpleType(proto.type)) {
            offset = this.writeBytes(buffer, offset, this.encodeTag(proto.type, proto.tag));
            offset = this.writeBytes(buffer, offset, codec.encodeUInt32(array.length));
            for (i = 0; i < array.length; i++) {
                offset = this.encodeProp(array[i], proto.type, offset, buffer);
            }
        } else {
            for (i = 0; i < array.length; i++) {
                offset = this.writeBytes(buffer, offset, this.encodeTag(proto.type, proto.tag));
                offset = this.encodeProp(array[i], proto.type, offset, buffer, protos);
            }
        }

        return offset;
    }

    encodeMap(map: Map < (string | number), any > , proto: { [key: string]: any }, offset: number, buffer: Buffer, protos: { [key: string]: any }) {
        const size = map.size;
        offset = this.writeBytes(buffer, offset, this.encodeTag(proto.type, proto.tag));
        offset = this.writeBytes(buffer, offset, codec.encodeUInt32(size));
        for(const [key, value] of map) {
            let message: { [key: string]: any } = protos.__messages[proto.type] || this.protos['message ' + proto.type];
            // map key
            offset = this.encodeProp(key, message.key.type, offset, buffer, protos);
            offset = this.encodeProp(value, message.value.type, offset, buffer, protos);
        }
        return offset;
    }

    encodeObject(obj: {[key: string]: any}, proto: { [key: string]: any }, offset: number, buffer: Buffer, protos: { [key: string]: any }) {
        const keys = Object.keys(obj);
        if (keys.length === 0) {
            return offset;
        }
        offset = this.writeBytes(buffer, offset, this.encodeTag(proto.type, proto.tag));
        offset = this.writeBytes(buffer, offset, codec.encodeUInt32(keys.length));
        for (let key in obj) {
            let message: { [key: string]: any } = protos.__messages[proto.type] || this.protos['message ' + proto.type];
            // map key
            offset = this.encodeProp(key, message.key.type, offset, buffer, protos);
            const value = obj[key];
            offset = this.encodeProp(value, message.value.type, offset, buffer, protos);
        }
        return offset;
    }

    writeBytes(buffer: Buffer, offset: number, bytes: Array<number>) {
        for (let i = 0; i < bytes.length; i++) {
            buffer.writeUInt8(bytes[i], offset);
            offset++;
        }

        return offset;
    }

    encodeTag(type: keyof typeof constant.TYPES, tag: number) {
        let value = constant.TYPES[type];

        if (value === undefined) value = 2;

        return codec.encodeUInt32((tag << 3) | value);
    }
}
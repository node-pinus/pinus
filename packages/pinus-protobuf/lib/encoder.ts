import * as codec from './codec';
import * as constant from './constant';
import * as util from './util';

export class Encoder {
    protos: any;

    constructor(protos: any) {
        this.init(protos);
    }

    init(protos: any) {
        this.protos = protos || {};
    }

    encode(route: string, msg: {[key: string]: any}) {
        if (!route || !msg) {
            console.warn('Route or msg can not be null! route : %j, msg %j', route, msg);
            return null;
        }

        // Get protos from protos map use the route as key
        let protos = this.protos[route];

        // Check msg
        if (!this.checkMsg(msg, protos)) {
            console.warn('check msg failed! msg : %j, proto : %j', msg, protos);
            return null;
        }

        // Set the length of the buffer 2 times bigger to prevent overflow
        let length = Buffer.byteLength(JSON.stringify(msg)) * 2;

        // Init buffer and offset
        let buffer = new Buffer(length);
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
    checkMsg(msg: {[key: string]: any}, protos: {[key: string]: any}) {
        if (!protos || !msg) {
            console.warn('no protos or msg exist! msg : %j, protos : %j', msg, protos);
            return false;
        }

        for (let name in protos) {
            let proto = protos[name];

            // All required element must exist
            switch (proto.option) {
                case 'required':
                    if (typeof (msg[name]) === 'undefined') {
                        console.warn('no property exist for required! name: %j, proto: %j, msg: %j', name, proto, msg);
                        return false;
                    }
                case 'optional':
                    if (typeof (msg[name]) !== 'undefined') {
                        let message = protos.__messages[proto.type] || this.protos['message ' + proto.type];
                        if (!!message && !this.checkMsg(msg[name], message)) {
                            console.warn('inner proto error! name: %j, proto: %j, msg: %j', name, proto, msg);
                            return false;
                        }
                    }
                    break;
                case 'repeated':
                    // Check nest message in repeated elements
                    let message = protos.__messages[proto.type] || this.protos['message ' + proto.type];
                    if (!!msg[name] && !!message) {
                        for (let i = 0; i < msg[name].length; i++) {
                            if (!this.checkMsg(msg[name][i], message)) {
                                return false;
                            }
                        }
                    }
                    break;
            }
        }

        return true;
    }

    encodeMsg(buffer: Buffer, offset: number, protos: {[key: string]: any}, msg: {[key: string]: any}) {
        for (let name in msg) {
            if (!!protos[name]) {
                let proto = protos[name];

                switch (proto.option) {
                    case 'required':
                    case 'optional':
                        offset = this.writeBytes(buffer, offset, this.encodeTag(proto.type, proto.tag));
                        offset = this.encodeProp(msg[name], proto.type, offset, buffer, protos);
                        break;
                    case 'repeated':
                        if (!!msg[name] && msg[name].length > 0) {
                            offset = this.encodeArray(msg[name], proto, offset, buffer, protos);
                        }
                        break;
                }
            }
        }

        return offset;
    }

    encodeProp(value: any, type: string, offset: number, buffer: Buffer, protos?: {[key: string]: any}) {
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
            default:
                let message: {[key: string]: any} = protos.__messages[type] || this.protos['message ' + type];
                if (!!message) {
                    // Use a tmp buffer to build an internal msg
                    let tmpBuffer = new Buffer(Buffer.byteLength(JSON.stringify(value)) * 2);
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
    encodeArray(array: Array<number>, proto: {[key: string]: any}, offset: number, buffer: Buffer, protos: {[key: string]: any}) {
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
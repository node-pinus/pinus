declare let Buffer: any;

let PKG_HEAD_BYTES = 4;
let MSG_FLAG_BYTES = 1;
let MSG_ROUTE_CODE_BYTES = 2;
let MSG_ID_MAX_BYTES = 5;
let MSG_ROUTE_LEN_BYTES = 1;

let MSG_ROUTE_CODE_MAX = 0xffff;

let MSG_COMPRESS_ROUTE_MASK = 0x1;
let MSG_COMPRESS_GZIP_MASK = 0x1;
let MSG_COMPRESS_GZIP_ENCODE_MASK = 1 << 4;
let MSG_TYPE_MASK = 0x7;

export namespace Protocol {
  /**
   * pomele client encode
   * id message id;
   * route message route
   * msg message body
   * socketio current support string
   */
  export function strencode(str: string) {
      // encoding defaults to 'utf8'
      return new Buffer(str);
  }

  /**
   * client decode
   * msg String data
   * return Message Object
   */
  export function strdecode(buffer: object) {
      // encoding defaults to 'utf8'
      return buffer.toString();
  }
}


export namespace Package {

  export let TYPE_HANDSHAKE = 1;
  export let TYPE_HANDSHAKE_ACK = 2;
  export let TYPE_HEARTBEAT = 3;
  export let TYPE_DATA = 4;
  export let TYPE_KICK = 5;

  /**
   * Package protocol encode.
   *
   * Pinus package format:
   * +------+-------------+------------------+
   * | type | body length |       body       |
   * +------+-------------+------------------+
   *
   * Head: 4bytes
   *   0: package type,
   *      1 - handshake,
   *      2 - handshake ack,
   *      3 - heartbeat,
   *      4 - data
   *      5 - kick
   *   1 - 3: big-endian body length
   * Body: body length bytes
   *
   * @param  {Number}    type   package type
   * @param  {Buffer} body   body content in bytes
   * @return {Buffer}        new byte array that contains encode result
   */
  export function encode(type: number, body?: Buffer) {
    let length = body ? body.length : 0;
    let buffer = new Buffer(PKG_HEAD_BYTES + length);
    let index = 0;
    buffer[index++] = type & 0xff;
    buffer[index++] = (length >> 16) & 0xff;
    buffer[index++] = (length >> 8) & 0xff;
    buffer[index++] = length & 0xff;
    if (body) {
      copyArray(buffer, index, body, 0, length);
    }
    return buffer;
  }

  /**
   * Package protocol decode.
   * See encode for package format.
   *
   * @param  {Buffer} buffer byte array containing package content
   * @return {Object}           {type: package type, buffer: body byte array}
   */
  export function decode(buffer: Buffer) {
    let offset = 0;
    let bytes = new Buffer(buffer);
    let length = 0;
    let rs = [];
    while (offset < bytes.length) {
      let type = bytes[offset++];
      length = ((bytes[offset++]) << 16 | (bytes[offset++]) << 8 | bytes[offset++]) >>> 0;
      let body = length ? new Buffer(length) : null;
      if (body) {
        copyArray(body, 0, bytes, offset, length);
      }
      offset += length;
      rs.push({ 'type': type, 'body': body });
    }
    return rs.length === 1 ? rs[0] : rs;
  }
}

export namespace Message {

  export let TYPE_REQUEST = 0;
  export let TYPE_NOTIFY = 1;
  export let TYPE_RESPONSE = 2;
  export let TYPE_PUSH = 3;
  /**
   * Message protocol encode.
   *
   * @param  {Number} id            message id
   * @param  {Number} type          message type
   * @param  {Number} compressRoute whether compress route
   * @param  {Number|String} route  route code or route string
   * @param  {Buffer} msg           message body bytes
   * @return {Buffer}               encode result
   */
  export function encode(id: number, type: number, compressRoute: boolean, route: number | string | Buffer, msg: Buffer, compressGzip?: boolean) {
    // caculate message max length
    let idBytes = msgHasId(type) ? caculateMsgIdBytes(id) : 0;
    let msgLen = MSG_FLAG_BYTES + idBytes;

    if (msgHasRoute(type)) {
      if (compressRoute) {
        if (typeof route !== 'number') {
          throw new Error('error flag for number route!');
        }
        msgLen += MSG_ROUTE_CODE_BYTES;
      } else {
        msgLen += MSG_ROUTE_LEN_BYTES;
        if (route) {
          route = Protocol.strencode(route as string);
          if ((route as string).length > 255) {
            throw new Error('route maxlength is overflow');
          }
          msgLen += (route as string).length;
        }
      }
    }

    if (msg) {
      msgLen += msg.length;
    }

    let buffer = new Buffer(msgLen);
    let offset = 0;

    // add flag
    offset = encodeMsgFlag(type, compressRoute, buffer, offset, compressGzip);

    // add message id
    if (msgHasId(type)) {
      offset = encodeMsgId(id, buffer, offset);
    }

    // add route
    if (msgHasRoute(type)) {
      offset = encodeMsgRoute(compressRoute, route, buffer, offset);
    }

    // add body
    if (msg) {
      offset = encodeMsgBody(msg, buffer, offset);
    }

    return buffer;
  }

  /**
   * Message protocol decode.
   *
   * @param  {Buffer|Uint8Array} buffer message bytes
   * @return {Object}            message object
   */
  export function decode(buffer: Buffer) {
    let bytes = new Buffer(buffer);
    let bytesLen = bytes.length || bytes.byteLength;
    let offset = 0;
    let id = 0;
    let route = null;

    // parse flag
    let flag = bytes[offset++];
    let compressRoute = flag & MSG_COMPRESS_ROUTE_MASK;
    let type = (flag >> 1) & MSG_TYPE_MASK;
    let compressGzip = (flag >> 4) & MSG_COMPRESS_GZIP_MASK;

    // parse id
    if (msgHasId(type)) {
      let m = 0;
      let i = 0;
      do {
        m = parseInt(bytes[offset]);
        id += (m & 0x7f) << (7 * i);
        offset++;
        i++;
      } while (m >= 128);
    }

    // parse route
    if (msgHasRoute(type)) {
      if (compressRoute) {
        route = (bytes[offset++]) << 8 | bytes[offset++];
      } else {
        let routeLen = bytes[offset++];
        if (routeLen) {
          route = new Buffer(routeLen);
          copyArray(route, 0, bytes, offset, routeLen);
          route = Protocol.strdecode(route);
        } else {
          route = '';
        }
        offset += routeLen;
      }
    }

    // parse body
    let bodyLen = bytesLen - offset;
    let body = new Buffer(bodyLen);

    copyArray(body, 0, bytes, offset, bodyLen);

    return {
      'id': id, 'type': type, 'compressRoute': compressRoute,
      'route': route, 'body': body, 'compressGzip': compressGzip
    };
  }
}
let copyArray = function (dest: Buffer, doffset: number, src: Buffer, soffset: number, length: number) {
  if ('function' === typeof src.copy) {
    // Buffer
    src.copy(dest, doffset, soffset, soffset + length);
  } else {
    // Uint8Array
    for (let index = 0; index < length; index++) {
      dest[doffset++] = src[soffset++];
    }
  }
};

let msgHasId = function (type: number) {
  return type === Message.TYPE_REQUEST || type === Message.TYPE_RESPONSE;
};

let msgHasRoute = function (type: number) {
  return type === Message.TYPE_REQUEST || type === Message.TYPE_NOTIFY ||
    type === Message.TYPE_PUSH;
};

let caculateMsgIdBytes = function (id: number) {
  let len = 0;
  do {
    len += 1;
    id >>= 7;
  } while (id > 0);
  return len;
};

let encodeMsgFlag = function (type: number, compressRoute: boolean, buffer: Buffer, offset: number, compressGzip: boolean) {
  if (type !== Message.TYPE_REQUEST && type !== Message.TYPE_NOTIFY &&
    type !== Message.TYPE_RESPONSE && type !== Message.TYPE_PUSH) {
    throw new Error('unkonw message type: ' + type);
  }

  buffer[offset] = (type << 1) | (compressRoute ? 1 : 0);

  if (compressGzip) {
    buffer[offset] = buffer[offset] | MSG_COMPRESS_GZIP_ENCODE_MASK;
  }

  return offset + MSG_FLAG_BYTES;
};

let encodeMsgId = function (id: number, buffer: Buffer, offset: number) {
  do {
    let tmp = id % 128;
    let next = Math.floor(id / 128);

    if (next !== 0) {
      tmp = tmp + 128;
    }
    buffer[offset++] = tmp;

    id = next;
  } while (id !== 0);

  return offset;
};

let encodeMsgRoute = function (compressRoute: boolean, _route: number | string | Buffer, buffer: Buffer, offset: number) {
  if (compressRoute) {
    let route = _route as number;
    if (route > MSG_ROUTE_CODE_MAX) {
      throw new Error('route number is overflow');
    }

    buffer[offset++] = (route >> 8) & 0xff;
    buffer[offset++] = route & 0xff;
  } else {
    let route = _route as Buffer;
    if (route) {
      buffer[offset++] = route.length & 0xff;
      copyArray(buffer, offset, route as Buffer, 0, route.length);
      offset += route.length;
    } else {
      buffer[offset++] = 0;
    }
  }

  return offset;
};

let encodeMsgBody = function (msg: Buffer, buffer: Buffer, offset: number) {
  copyArray(buffer, offset, msg, 0, msg.length);
  return offset + msg.length;
};

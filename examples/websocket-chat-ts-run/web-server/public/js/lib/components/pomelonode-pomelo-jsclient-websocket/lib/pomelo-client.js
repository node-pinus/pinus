(function() {
  var JS_WS_CLIENT_TYPE = 'js-websocket';
  var JS_WS_CLIENT_VERSION = '0.0.1';

  var Protocol = window.Protocol;
  var protobuf = window.protobuf;
  var decodeIO_protobuf = window.decodeIO_protobuf;
  var decodeIO_encoder = null;
  var decodeIO_decoder = null;
  var Package = Protocol.Package;
  var Message = Protocol.Message;
  var EventEmitter = window.EventEmitter;
  var rsa = window.rsa;

  if(typeof(window) != "undefined" && typeof(sys) != 'undefined' && sys.localStorage) {
    window.localStorage = sys.localStorage;
  }
  
  var RES_OK = 200;
  var RES_FAIL = 500;
  var RES_OLD_CLIENT = 501;

  if (typeof Object.create !== 'function') {
    Object.create = function (o) {
      function F() {}
      F.prototype = o;
      return new F();
    };
  }

  var root = window;
  var pomelo = Object.create(EventEmitter.prototype); // object extend from object
  root.pomelo = pomelo;
  var socket = null;
  var reqId = 0;
  var callbacks = {};
  var handlers = {};
  //Map from request id to route
  var routeMap = {};
  var dict = {};    // route string to code
  var abbrs = {};   // code to route string
  var serverProtos = {};
  var clientProtos = {};
  var protoVersion = 0;

  var heartbeatInterval = 0;
  var heartbeatTimeout = 0;
  var nextHeartbeatTimeout = 0;
  var gapThreshold = 100;   // heartbeat gap threashold
  var heartbeatId = null;
  var heartbeatTimeoutId = null;
  var handshakeCallback = null;

  var decode = null;
  var encode = null;

  var reconnect = false;
  var reconncetTimer = null;
  var reconnectUrl = null;
  var reconnectAttempts = 0;
  var reconnectionDelay = 5000;
  var DEFAULT_MAX_RECONNECT_ATTEMPTS = 10;

  var useCrypto;

  var handshakeBuffer = {
    'sys': {
      type: JS_WS_CLIENT_TYPE,
      version: JS_WS_CLIENT_VERSION,
      rsa: {}
    },
    'user': {
    }
  };

  var initCallback = null;

  pomelo.init = function(params, cb) {
    initCallback = cb;
    var host = params.host;
    var port = params.port;

    encode = params.encode || defaultEncode;
    decode = params.decode || defaultDecode;

    var url = 'ws://' + host;
    if(port) {
      url +=  ':' + port;
    }

    handshakeBuffer.user = params.user;
    if(params.encrypt) {
      useCrypto = true;
      rsa.generate(1024, "10001");
      var data = {
        rsa_n: rsa.n.toString(16),
        rsa_e: rsa.e
      }
      handshakeBuffer.sys.rsa = data;
    }
    handshakeCallback = params.handshakeCallback;
    connect(params, url, cb);
  };

  var defaultDecode = pomelo.decode = function(data) {
    //probuff decode
    var msg = Message.decode(data);

    if(msg.id > 0){
      msg.route = routeMap[msg.id];
      delete routeMap[msg.id];
      if(!msg.route){
        return;
      }
    }

    msg.body = deCompose(msg);
    return msg;
  };

  var defaultEncode = pomelo.encode = function(reqId, route, msg) {
    var type = reqId ? Message.TYPE_REQUEST : Message.TYPE_NOTIFY;

    //compress message by protobuf
    if(protobuf && clientProtos[route]) {
      msg = protobuf.encode(route, msg);
    } else if(decodeIO_encoder && decodeIO_encoder.lookup(route)) {
      var Builder = decodeIO_encoder.build(route);
      msg = new Builder(msg).encodeNB();
    } else {
      msg = Protocol.strencode(JSON.stringify(msg));
    }

    var compressRoute = 0;
    if(dict && dict[route]) {
      route = dict[route];
      compressRoute = 1;
    }

    return Message.encode(reqId, type, compressRoute, route, msg);
  };

  var connect = function(params, url, cb) {
    console.log('connect to ' + url);

    var params = params || {};
    var maxReconnectAttempts = params.maxReconnectAttempts || DEFAULT_MAX_RECONNECT_ATTEMPTS;
    reconnectUrl = url;
    //Add protobuf version
    if(window.localStorage && window.localStorage.getItem('protos') && protoVersion === 0) {
      var protos = JSON.parse(window.localStorage.getItem('protos'));

      protoVersion = protos.version || 0;
      serverProtos = protos.server || {};
      clientProtos = protos.client || {};

      if(!!protobuf) {
        protobuf.init({encoderProtos: clientProtos, decoderProtos: serverProtos});
      } 
      if(!!decodeIO_protobuf) {
        decodeIO_encoder = decodeIO_protobuf.loadJson(clientProtos);
        decodeIO_decoder = decodeIO_protobuf.loadJson(serverProtos);
      }
    }
    //Set protoversion
    handshakeBuffer.sys.protoVersion = protoVersion;

    var onopen = function(event) {
      if(!!reconnect) {
        pomelo.emit('reconnect');
      }
      reset();
      var obj = Package.encode(Package.TYPE_HANDSHAKE, Protocol.strencode(JSON.stringify(handshakeBuffer)));
      send(obj);
    };
    var onmessage = function(event) {
      processPackage(Package.decode(event.data), cb);
      // new package arrived, update the heartbeat timeout
      if(heartbeatTimeout) {
        nextHeartbeatTimeout = Date.now() + heartbeatTimeout;
      }
    };
    var onerror = function(event) {
      pomelo.emit('io-error', event);
      console.error('socket error: ', event);
    };
    var onclose = function(event) {
      pomelo.emit('close',event);
      pomelo.emit('disconnect', event);
      console.error('socket close: ', event);
      if(!!params.reconnect && reconnectAttempts < maxReconnectAttempts) {
        reconnect = true;
        reconnectAttempts++;
        reconncetTimer = setTimeout(function() {
          connect(params, reconnectUrl, cb);
        }, reconnectionDelay);
        reconnectionDelay *= 2;
      }
    };
    socket = new WebSocket(url);
    socket.binaryType = 'arraybuffer';
    socket.onopen = onopen;
    socket.onmessage = onmessage;
    socket.onerror = onerror;
    socket.onclose = onclose;
  };

  pomelo.disconnect = function() {
    if(socket) {
      if(socket.disconnect) socket.disconnect();
      if(socket.close) socket.close();
      console.log('disconnect');
      socket = null;
    }

    if(heartbeatId) {
      clearTimeout(heartbeatId);
      heartbeatId = null;
    }
    if(heartbeatTimeoutId) {
      clearTimeout(heartbeatTimeoutId);
      heartbeatTimeoutId = null;
    }
  };

  var reset = function() {
    reconnect = false;
    reconnectionDelay = 1000 * 5;
    reconnectAttempts = 0;
    clearTimeout(reconncetTimer);
  };

  pomelo.request = function(route, msg, cb) {
    if(arguments.length === 2 && typeof msg === 'function') {
      cb = msg;
      msg = {};
    } else {
      msg = msg || {};
    }
    route = route || msg.route;
    if(!route) {
      return;
    }

    reqId++;
    sendMessage(reqId, route, msg);

    callbacks[reqId] = cb;
    routeMap[reqId] = route;
  };

  pomelo.notify = function(route, msg) {
    msg = msg || {};
    sendMessage(0, route, msg);
  };

  var sendMessage = function(reqId, route, msg) {
    if(useCrypto) {
      msg = JSON.stringify(msg);
      var sig = rsa.signString(msg, "sha256");
      msg = JSON.parse(msg);
      msg['__crypto__'] = sig;
    }

    if(encode) {
      msg = encode(reqId, route, msg);
    }

    var packet = Package.encode(Package.TYPE_DATA, msg);
    send(packet);
  };

  var send = function(packet) {
    socket.send(packet.buffer);
  };

  var handler = {};

  var heartbeat = function(data) {
    if(!heartbeatInterval) {
      // no heartbeat
      return;
    }

    var obj = Package.encode(Package.TYPE_HEARTBEAT);
    if(heartbeatTimeoutId) {
      clearTimeout(heartbeatTimeoutId);
      heartbeatTimeoutId = null;
    }

    if(heartbeatId) {
      // already in a heartbeat interval
      return;
    }
    heartbeatId = setTimeout(function() {
      heartbeatId = null;
      send(obj);

      nextHeartbeatTimeout = Date.now() + heartbeatTimeout;
      heartbeatTimeoutId = setTimeout(heartbeatTimeoutCb, heartbeatTimeout);
    }, heartbeatInterval);
  };

  var heartbeatTimeoutCb = function() {
    var gap = nextHeartbeatTimeout - Date.now();
    if(gap > gapThreshold) {
      heartbeatTimeoutId = setTimeout(heartbeatTimeoutCb, gap);
    } else {
      console.error('server heartbeat timeout');
      pomelo.emit('heartbeat timeout');
      pomelo.disconnect();
    }
  };

  var handshake = function(data) {
    data = JSON.parse(Protocol.strdecode(data));
    if(data.code === RES_OLD_CLIENT) {
      pomelo.emit('error', 'client version not fullfill');
      return;
    }

    if(data.code !== RES_OK) {
      pomelo.emit('error', 'handshake fail');
      return;
    }

    handshakeInit(data);

    var obj = Package.encode(Package.TYPE_HANDSHAKE_ACK);
    send(obj);
    if(initCallback) {
      initCallback(socket);
    }
  };

  var onData = function(data) {
    var msg = data;
    if(decode) {
      msg = decode(msg);
    }
    processMessage(pomelo, msg);
  };

  var onKick = function(data) {
    data = JSON.parse(Protocol.strdecode(data));
    pomelo.emit('onKick', data);
  };

  handlers[Package.TYPE_HANDSHAKE] = handshake;
  handlers[Package.TYPE_HEARTBEAT] = heartbeat;
  handlers[Package.TYPE_DATA] = onData;
  handlers[Package.TYPE_KICK] = onKick;

  var processPackage = function(msgs) {
    if(Array.isArray(msgs)) {
      for(var i=0; i<msgs.length; i++) {
        var msg = msgs[i];
        handlers[msg.type](msg.body);
      }
    } else {
      handlers[msgs.type](msgs.body);
    }
  };

  var processMessage = function(pomelo, msg) {
    if(!msg.id) {
      // server push message
      pomelo.emit(msg.route, msg.body);
      return;
    }

    //if have a id then find the callback function with the request
    var cb = callbacks[msg.id];

    delete callbacks[msg.id];
    if(typeof cb !== 'function') {
      return;
    }

    cb(msg.body);
    return;
  };

  var processMessageBatch = function(pomelo, msgs) {
    for(var i=0, l=msgs.length; i<l; i++) {
      processMessage(pomelo, msgs[i]);
    }
  };

  var deCompose = function(msg) {
    var route = msg.route;

    //Decompose route from dict
    if(msg.compressRoute) {
      if(!abbrs[route]){
        return {};
      }

      route = msg.route = abbrs[route];
    }
    if(protobuf && serverProtos[route]) {
      return protobuf.decode(route, msg.body);
    } else if(decodeIO_decoder && decodeIO_decoder.lookup(route)) {
      return decodeIO_decoder.build(route).decode(msg.body);
    } else {
      return JSON.parse(Protocol.strdecode(msg.body));
    }

    return msg;
  };

  var handshakeInit = function(data) {
    if(data.sys && data.sys.heartbeat) {
      heartbeatInterval = data.sys.heartbeat * 1000;   // heartbeat interval
      heartbeatTimeout = heartbeatInterval * 2;        // max heartbeat timeout
    } else {
      heartbeatInterval = 0;
      heartbeatTimeout = 0;
    }

    initData(data);

    if(typeof handshakeCallback === 'function') {
      handshakeCallback(data.user);
    }
  };

  //Initilize data used in pomelo client
  var initData = function(data) {
    if(!data || !data.sys) {
      return;
    }
    dict = data.sys.dict;
    var protos = data.sys.protos;

    //Init compress dict
    if(dict) {
      dict = dict;
      abbrs = {};

      for(var route in dict) {
        abbrs[dict[route]] = route;
      }
    }

    //Init protobuf protos
    if(protos) {
      protoVersion = protos.version || 0;
      serverProtos = protos.server || {};
      clientProtos = protos.client || {};

        //Save protobuf protos to localStorage
        window.localStorage.setItem('protos', JSON.stringify(protos));

        if(!!protobuf) {
          protobuf.init({encoderProtos: protos.client, decoderProtos: protos.server});
        }
        if(!!decodeIO_protobuf) {
          decodeIO_encoder = decodeIO_protobuf.loadJson(clientProtos);
          decodeIO_decoder = decodeIO_protobuf.loadJson(serverProtos);
        }
      }
    };

    module.exports = pomelo;
  })();
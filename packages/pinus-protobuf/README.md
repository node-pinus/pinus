[![Build Status](https://travis-ci.org/node-pinus/pinus-protobuf.svg?branch=master)](https://travis-ci.org/node-pinus/pinus-protobuf)

#Pinus-protobuf
  Protobuf protocol is a high efficient binary protocol for data encode, this module implement the protobuf protocol, and used in [pinus](https://github.com/mybios/pinus) for data transfer.
Of course, pinus-protobuf can also be used independently in other projects.
##Architecture
Unlike the google protobuf, we provide a universal encoder and decoder in pinus-protobuf. We use protos file as meta data to encode/decode messages, so you do not need to add any code to your project, instead , what you need is to add a protos.json (or two for different encoder and decoder messages) files to define the message need to encode by protobuf.The architecture of pinus-protobuf is as follow:

![pinus protobuf](http://pinus.netease.com/resource/documentImage/protocol/Protobuf_pinus.png)

##Usage
###Define protos
To use pinus-protobuf, you need to write a JSON file to define the message format. The syntax of the file is as the same as the .proto file in protobuf, but in JSON format, here is the example protos.json:

  ```
  {
    "onMove" : {
      "required uInt32 entityId" : 1,
      "message Path": {
        "required uInt32 x" : 1,
        "required uInt32 y" : 2
      },
      "repeated Path path" : 2,
      "required uInt32 speed" : 3
    },
    "onAttack" : {
      "required uInt32 attacker" : 1,
      "required uInt32 target" : 2,
      "message AttackResult" : {
        "required uInt32 result" :  1,
        "required uInt32 damage" : 2,
        "optional uInt32 exp" : 3
      },
      "required AttackResult result" : 3
    }
  }
  ```

Unlike the google protobuf, we write all the protos in the same file, with a unique key to define the message.

To use the protos, we use a parser to parse the protos file into more machine friendly format, which is also a json format, then you can use the result to decode/encode messages.

###RootMessage support
you can write rootMessage in protos for global usage  
```
{
  "message Path": {
    "required double x" : 1,
    "required double y" : 2
  },
  "message Equipment" : {
    "required uInt32 entityId" : 1,
    "required uInt32 kindId" : 2
  },
  "onMove" : {
    "required uInt32 entityId" : 1,
    "repeated Path path" : 2,
    "required float speed" : 3
  },
  "area.playerHandler.enterScene" : {
    "message Player" : {
      "message Bag" : {
        "message Item" : {
          "required uInt32 id" : 1,
          "optional string type" : 2
        },
        "repeated Item items" : 1
      },
      "required uInt32 entityId" : 1,
      "required uInt32 kindId" : 2,
      "required Bag bag" : 3,
      "repeated Equipment equipments" : 4
    },
    "optional Player curPlayer" : 2
  }
}
```

###Server side and Client side
Pinus-protobuf has server code and client code for js.

- The server code run in Node.JS environment, use Buffer to represent the binary data.
- The client side code run on browser, use ByteArray to represent the binary data.

On average, the encode/decode speed of Server version is 60% faster than client version, with less memory usage. So we  highly recommend that use the server code on Node.JS for better performance.

### Example message

  ```
  var key = 'onMove';
  var msg = {
    entityId : 14,
    path : [{x : 128,y : 796},{x : 677,y : 895}],
    speed : 160
  };

  ```

### Server side encode/decode

  ```
  //Require proto buf module
  var protobuf = require('protobuf');

  //Set encode protos and decode protos
  var protos = protobuf.parse(require('./protos.json'));
  protobuf.init({encoderProtos:protos, decoderProtos:protos});

  //Encode msg to binary Buffer
  var buffer = protobuf.encode(key, msg);

  //Decode a msg from binary buffer
  var decodeMsg = protobuf.decode(key, buffer);

  ```
At server side, the encode result will be a Buffer.
The encoderProtos and decodeProtos can be different, in this case we use the same protos for encoder and decoder.

### Client side encode/decode
To use the protbuf as browser, you need to include the /client/protobuf.js in your html.

  ```
  //Require proto buf
  var protobuf = require('protobuf');

  //Get parsed protos from server
  var protos = getProtos();

  //Init protobuf
  protobuf.init({encoderProtos:protos, decoderProtos:protos});

  //Encode msg to binary Buffer
  var buffer = protobuf.encode(key, msg);

  //Decode a msg from binary buffer
  var decodeMsg = protobuf.decode(key, buffer);

  ```

The protobuf will be a global variable, and you need to get the parsed protos from server.
The others are the same as in server side, except the encoder result will by a ByteArray instead of Buffer.

###Compatibility
For the same message and proto, the encode results are **the same** for **pinus-protobuf** and **google protobuf** .This means you can exchange binary data with google-protobuf.

Some how we has some changes in the proto file, and there are some features we do not support, there are the different:

- **package** : The array with simple content (integer, float) are packaged by default.And the complex content(message, string) are not packaged.

- **long** : Pinus protocol do not support long type, because there are no long int in javascript.All the integer bigger than 32 bits will be translate to a 64bit float, which has only has 52 bits significant figure. It will lost presion for any integer has more than 52 bits significant figures.

- **default** : Pinus-protobuf do not support default keyword, for the default value is only used to initialized the element at the decoder side, which can be done by the constructor.

- **enum** : Pinus-protobuf do not support the enum keyword.

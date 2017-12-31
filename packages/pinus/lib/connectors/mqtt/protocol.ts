/* Protocol - protocol constants */

/* Command code => mnemonic */
export var types = {
  0: 'reserved',
  1: 'connect',
  2: 'connack',
  3: 'publish',
  4: 'puback',
  5: 'pubrec',
  6: 'pubrel',
  7: 'pubcomp',
  8: 'subscribe',
  9: 'suback',
  10: 'unsubscribe',
  11: 'unsuback',
  12: 'pingreq',
  13: 'pingresp',
  14: 'disconnect',
  15: 'reserved'
};

/* Mnemonic => Command code */
export var codes : {[key:string]:number} = {};
for(var k in types) {
  var v = (types as any)[k];
  codes[v] = Number(k);
}

/* Header */
export var CMD_SHIFT = 4;
export var CMD_MASK = 0xF0;
export var DUP_MASK = 0x08;
export var QOS_MASK = 0x03;
export var QOS_SHIFT = 1;
export var RETAIN_MASK = 0x01;

/* Length */
export var LENGTH_MASK = 0x7F;
export var LENGTH_FIN_MASK = 0x80;

/* Connect */
export var USERNAME_MASK = 0x80;
export var PASSWORD_MASK = 0x40;
export var WILL_RETAIN_MASK = 0x20;
export var WILL_QOS_MASK = 0x18;
export var WILL_QOS_SHIFT = 3;
export var WILL_FLAG_MASK = 0x04;
export var CLEAN_SESSION_MASK = 0x02;

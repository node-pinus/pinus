/* Protocol - protocol constants */

/* Command code => mnemonic */
export let types = {
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
export let codes: {[key: string]: number} = {};
for(let k in types) {
  let v = (types as any)[k];
  codes[v] = Number(k);
}

/* Header */
export let CMD_SHIFT = 4;
export let CMD_MASK = 0xF0;
export let DUP_MASK = 0x08;
export let QOS_MASK = 0x03;
export let QOS_SHIFT = 1;
export let RETAIN_MASK = 0x01;

/* Length */
export let LENGTH_MASK = 0x7F;
export let LENGTH_FIN_MASK = 0x80;

/* Connect */
export let USERNAME_MASK = 0x80;
export let PASSWORD_MASK = 0x40;
export let WILL_RETAIN_MASK = 0x20;
export let WILL_QOS_MASK = 0x18;
export let WILL_QOS_SHIFT = 3;
export let WILL_FLAG_MASK = 0x04;
export let CLEAN_SESSION_MASK = 0x02;

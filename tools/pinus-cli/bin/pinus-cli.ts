#!/usr/bin/env node

import * as cli from '../lib/cli';
import * as util from '../lib/util';
import { consts } from '../lib/consts';
import { argv } from 'optimist';

let extra = argv._;

if (extra && extra.length) {
    showHelp();
} else {
    if (argv['help']) {
        showHelp();
    } else {
        cli.default();
    }
}

function showHelp() {
    let HELP_LOGIN = consts.HELP_LOGIN;
    for (let i = 0; i < HELP_LOGIN.length; i++) {
        util.log(HELP_LOGIN[i]);
    }
}
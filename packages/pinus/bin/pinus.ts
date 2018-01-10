#!/usr/bin/env node

/**
 * Module dependencies.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as program from 'commander';
import { COMMAND_ERROR } from './utils/constants';
import { version } from './utils/utils';
import { isFunction } from 'util';

program.version(version);

program.command('*')
    .action(function () {
        console.log(COMMAND_ERROR);
    });

fs.readdirSync(__dirname + '/commands').forEach(function (filename) {
    if (/\.js$/.test(filename)) {
        let name = filename.substr(0, filename.lastIndexOf('.'));
        let _command = require('./commands/' + name).default;
        if (isFunction(_command)) {
            _command(program);
        }
    }
});

program.parse(process.argv);

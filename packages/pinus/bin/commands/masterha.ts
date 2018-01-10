


import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as program from 'commander';
import * as constants from '../../lib/util/constants';
import { connectToMaster, abort, runServer } from '../utils/utils';
import { ConsoleModule as co } from '../../lib/modules/console';
import { DEFAULT_USERNAME, DEFAULT_PWD, DEFAULT_MASTER_HOST, DEFAULT_MASTER_PORT, ADD_SERVER_INFO, DEFAULT_GAME_SERVER_DIR, MASTER_HA_NOT_FOUND } from '../utils/constants';

export default function (program: program.CommanderStatic) {
    program.command('masterha')
    .description('start all the slaves of the master')
    .option('-d, --directory <directory>', 'the code directory', DEFAULT_GAME_SERVER_DIR)
    .action(function (opts) {
        startMasterha(opts);
    });
}

/**
 * Start master slaves.
 *
 * @param {String} option for `startMasterha` operation
 */
function startMasterha(opts: any) {
    let configFile = path.join(opts.directory, constants.FILEPATH.MASTER_HA);
    if (!fs.existsSync(configFile)) {
        abort(MASTER_HA_NOT_FOUND);
    }
    let masterha = require(configFile).masterha;
    for (let i = 0; i < masterha.length; i++) {
        let server = masterha[i];
        server.mode = constants.RESERVED.STAND_ALONE;
        server.masterha = 'true';
        server.home = opts.directory;
        runServer(server);
    }
}
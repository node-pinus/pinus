
import * as program from 'commander';
import stop from './commands/stop'

program.version("1.2.3");

stop(program)

process.argv.push("stop","-P","3006","server1","server2")
program.parse(process.argv)
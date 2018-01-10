
require('cliff');
/**
 *  Constant Variables
 */
export let TIME_INIT = 5 * 1000;
export let TIME_KILL_WAIT = 5 * 1000;
export let KILL_CMD_LUX = 'kill -9 `ps -ef|grep node|awk \'{print $2}\'`';
export let KILL_CMD_WIN = 'taskkill /im node.exe /f';

export let CUR_DIR = process.cwd();
export let DEFAULT_GAME_SERVER_DIR = CUR_DIR;
export let DEFAULT_USERNAME = 'admin';
export let DEFAULT_PWD = 'admin';
export let DEFAULT_ENV = 'development';
export let DEFAULT_MASTER_HOST = '127.0.0.1';
export let DEFAULT_MASTER_PORT = 3005;

export let CONNECT_ERROR = 'Fail to connect to admin console server.';
export let FILEREAD_ERROR = 'Fail to read the file, please check if the application is started legally.';
export let CLOSEAPP_INFO = 'Closing the application......\nPlease wait......';
export let ADD_SERVER_INFO = 'Successfully add server.';
export let RESTART_SERVER_INFO = 'Successfully restart server.';
export let INIT_PROJ_NOTICE = ('\nThe default admin user is: \n\n' + '  username' as any).green + ': admin\n  ' + ('password' as any).green + ': admin\n\nYou can configure admin users by editing adminUser.json later.\n ';
export let SCRIPT_NOT_FOUND = ('Fail to find an appropriate script to run,\nplease check the current work directory or the directory specified by option `--directory`.\n' as any).red;
export let MASTER_HA_NOT_FOUND = ('Fail to find an appropriate masterha config file, \nplease check the current work directory or the arguments passed to.\n' as any).red;
export let COMMAND_ERROR = ('Illegal command format. Use `pinus --help` to get more info.\n' as any).red;
export let DAEMON_INFO = 'The application is running in the background now.\n';

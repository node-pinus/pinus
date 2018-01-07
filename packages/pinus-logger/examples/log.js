var logger = require('pinus-logger').getLogger('log', __filename, process.pid);

process.env.LOGGER_LINE = true;
logger.info('test1');
logger.warn('test2');
logger.error('test3');
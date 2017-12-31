import * as async from 'async';
import * as utils from '../../util/utils';
import { getLogger } from 'pinus-logger';
var logger = getLogger('pinus', __filename);
var transactionLogger = getLogger('transaction-log', __filename);
var transactionErrorLogger = getLogger('transaction-error-log', __filename);

export type TransactionCondictionFunction = (cb : (err ?:Error)=>void)=>void;
export type TransactionHandlerFunction = (cb : (err ?:Error)=>void)=>void;

export function transaction(name : string, conditions : TransactionCondictionFunction[], handlers : TransactionHandlerFunction[], retry: number)
{
    if (!retry)
    {
        retry = 1;
    }
    if (typeof name !== 'string')
    {
        logger.error('transaction name is error format, name: %s.', name);
        return;
    }
    if (typeof conditions !== 'object' || typeof handlers !== 'object')
    {
        logger.error('transaction conditions parameter is error format, conditions: %j, handlers: %j.', conditions, handlers);
        return;
    }

    var cmethods : TransactionCondictionFunction[] = [];
    var dmethods : TransactionHandlerFunction[] = [];
    var cnames : string[] = [];
    var dnames : string[] = [];
    for (var key in conditions)
    {
        if (typeof key !== 'string' || typeof conditions[key] !== 'function')
        {
            logger.error('transaction conditions parameter is error format, condition name: %s, condition function: %j.', key, conditions[key]);
            return;
        }
        cnames.push(key);
        cmethods.push(conditions[key]);
    }

    var i = 0;
    // execute conditions
    async.forEachSeries(cmethods, function (method, cb)
    {
        method(cb);
        transactionLogger.info('[%s]:[%s] condition is executed.', name, cnames[i]);
        i++;
    }, function (err : Error)
    {
        if (err)
        {
            process.nextTick(function ()
            {
                transactionLogger.error('[%s]:[%s] condition is executed with err: %j.', name, cnames[--i], err.stack);
                var log = {
                    name: name,
                    method: cnames[i],
                    time: Date.now(),
                    type: 'condition',
                    description: err.stack
                };
                transactionErrorLogger.error(JSON.stringify(log));
            });
            return;
        } else
        {
            // execute handlers
            process.nextTick(function ()
            {
                for (var key in handlers)
                {
                    if (typeof key !== 'string' || typeof handlers[key] !== 'function')
                    {
                        logger.error('transcation handlers parameter is error format, handler name: %s, handler function: %j.', key, handlers[key]);
                        return;
                    }
                    dnames.push(key);
                    dmethods.push(handlers[key]);
                }

                var flag = true;
                var times = retry;

                // do retry if failed util retry times
                async.whilst(
                    function ()
                    {
                        return retry > 0 && flag;
                    },
                    function (callback)
                    {
                        var j = 0;
                        retry--;
                        async.forEachSeries(dmethods, function (method, cb)
                        {
                            method(cb);
                            transactionLogger.info('[%s]:[%s] handler is executed.', name, dnames[j]);
                            j++;
                        }, function (err : Error)
                        {
                            if (err)
                            {
                                process.nextTick(function ()
                                {
                                    transactionLogger.error('[%s]:[%s]:[%s] handler is executed with err: %j.', name, dnames[--j], times - retry, err.stack);
                                    var log = {
                                        name: name,
                                        method: dnames[j],
                                        retry: times - retry,
                                        time: Date.now(),
                                        type: 'handler',
                                        description: err.stack
                                    };
                                    transactionErrorLogger.error(JSON.stringify(log));
                                    utils.invokeCallback(callback);
                                });
                                return;
                            }
                            flag = false;
                            utils.invokeCallback(callback);
                            process.nextTick(function ()
                            {
                                transactionLogger.info('[%s] all conditions and handlers are executed successfully.', name);
                            });
                        });
                    },
                    function (err)
                    {
                        if (err)
                        {
                            logger.error('transaction process is executed with error: %j', err);
                        }
                        // callback will not pass error
                    }
                );
            });
        }
    });
};
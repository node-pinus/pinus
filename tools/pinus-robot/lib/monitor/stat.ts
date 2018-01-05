import { Stream } from "stream";

/**
 * stat  receive agent client monitor data
 * merger vaild data that has response
 * when server  restart, it will clear
 *
 *
 */
let _ = require('underscore');
let stat = module.exports;
let _timeDataMap: { [key: string]: any } = {};
let _countDataMap: { [key: string]: any } = {};

let incrData: { [key: string]: any } = {};

stat.getTimeData = function ()
{
	return _timeDataMap;
};

stat.getCountData = function ()
{
	return _countDataMap;
};

/**
 * clear data
 */
stat.clear = function (agent: string)
{
	if (!!agent)
	{
		delete _timeDataMap[agent];
		delete _countDataMap[agent];
	} else
	{
		_timeDataMap = {};
		_countDataMap = {};
	}
};


stat.merge = function (agent: string, message: any)
{
	_timeDataMap[agent] = message.timeData;
	_countDataMap[agent] = message.incrData;
};

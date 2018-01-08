var cacheNodeInfo = {};
var _serverId = "";
var _yaxisId = "";
var _intervalId = "";
var _chart = null;
var _ymax = 0;
var seed = 0;
var _store1 = null;
var map = {
	'cpu(idle)': 'cpu_idle',
	'cpu(iowait)': 'cpu_iowait',
	'cpu(nice)': 'cpu_nice',
	'cpu(steal)': 'cpu_steal',
	'cpu(system)': 'cpu_system',
	'cpu(usr)': 'cpu_user',
	'mem(free/total)': 'free/total',
	'disk(kb_read)': 'kb_read',
	'disk(kb_read/s)': 'kb_read_per',
	'disk(kb_wrtn)': 'kb_wrtn',
	'disk(kb_wrtn/s)': 'kb_wrtn_per',
	'loadavg(1m)': 'm_1',
	'loadavg(5m)': 'm_5',
	'loadavg(15m)': 'm_15',
	'disk(tps)': 'tps'
};

Ext.onReady(function() {
	store1 = Ext.create('Ext.data.JsonStore', {
		fields: ['data1', 'data2'],
		data: []
	});

	Ext.BLANK_IMAGE_URL = '../ext-4.0.7-gpl/resources/themes/images/default/tree/s.gif';

	_chart = Ext.create('Ext.chart.Chart', {
		animate: true,
		shadow: true,
		store: store1,
		width: 960,
		height: 280,
		axes: [{
				type: 'Numeric',
				minimum: 0,
				maximum: 1.0,
				position: 'left',
				fields: ['data1'],
				title: 'loadavg(1m)'
			}, {
				type: 'Time',
				position: 'bottom',
				fields: ['date2'],
				title: 'time',
				dateFormat: 'G:i:s',
				//groupBy: 'year,month,day',
				step: [Ext.Date.MINUTE, 1],
				aggregateOp: 'sum',

				constrain: true,
				fromDate: new Date(Date.now()),
				toDate: new Date(Date.now() + 10 * 60 * 1000)
			}
		],
		series: [{
				type: 'line',
				axis: ['left', 'bottom'],
				//gutter: 80,
				xField: 'data2',
				yField: 'data1',
				tips: {
					trackMouse: true,
					width: 258,
					height: 20,
					renderer: function(klass, item) {
						var storeItem = item.storeItem;

						this.setTitle(storeItem.get('data1'));
					}
				}
			}
		]
	});

	var serverStore = Ext.create('Ext.data.Store', {
		fields: ['name', 'serverId']
	});

	var serverCom = Ext.create('Ext.form.ComboBox', {
		id: 'serverComId',
		fieldLabel: 'On Server',
		labelWidth: 60,
		store: serverStore,
		queryMode: 'local',
		displayField: 'serverId',
		valueField: 'name',
		margin: '8 0 0 10'
	});

	var yaxisStore = Ext.create('Ext.data.Store', {
		fields: ['name', 'yaxis']
	});

	var yaxisCom = Ext.create('Ext.form.ComboBox', {
		id: 'yaxisComId',
		fieldLabel: 'Y Axis',
		labelWidth: 60,
		store: yaxisStore,
		queryMode: 'local',
		displayField: 'yaxis',
		valueField: 'name',
		margin: '8 0 0 10'
	});

	var intervalStore = Ext.create('Ext.data.Store', {
		fields: ['name', 'interval']
	});

	var intervalCom = Ext.create('Ext.form.ComboBox', {
		id: 'intervalComId',
		fieldLabel: 'Monitor Interval(m)',
		labelWidth: 120,
		store: intervalStore,
		queryMode: 'local',
		displayField: 'interval',
		valueField: 'name',
		margin: '8 0 0 10'
	});

	/**
	 * system monitor data store
	 * without the data 'networkInterfaces'
	 */
	var sysStore = Ext.create('Ext.data.Store', {
		id: 'sysStore',
		autoLoad: false,
		pageSize: 5,
		fields: ['Time', 'hostname', 'serverId',
				'cpu_user', 'cpu_nice', 'cpu_system', 'cpu_iowait', 'cpu_steal', 'cpu_idle',
				'tps', 'kb_read', 'kb_wrtn', 'kb_read_per', 'kb_wrtn_per',
				'totalmem', 'freemem', 'free/total',
				'm_1', 'm_5', 'm_15',
		],
		//    groupField: 'department',
		proxy: {
			type: 'memory',
			reader: {
				type: 'json',
				root: 'sysItems'
			}
		}
	});
	/**
	 * system's detailed  information
	 */
	var sysPanel = Ext.create('Ext.grid.Panel', {
		id: 'gridPanelId',
		// title: 'more information',
		region: 'north',
		store: sysStore,
		autoScroll: true,
		height: 300,
		columns: [{
				xtype: 'rownumberer',
				width: 40,
				sortable: false
			}, {
				text: 'Time',
				width: 120,
				sortable: false,
				dataIndex: 'Time'
			}, {
				text: 'hostname',
				width: 100,
				sortable: true,
				dataIndex: 'hostname'
			}, {
				text: 'serverId',
				width: 120,
				sortable: false,
				dataIndex: 'serverId'
			}, {
				text: 'loadavg',
				columns: [{
						text: '1m',
						width: 60,
						sortable: true,
						dataIndex: 'm_1'
					}, {
						text: '5m',
						width: 60,
						sortable: true,
						dataIndex: 'm_5'
					}, {
						text: '15m',
						width: 60,
						sortable: true,
						dataIndex: 'm_15'
					}
				]
			}, {
				text: 'mem',
				columns: [{
						text: 'totalmem',
						width: 70,
						sortable: true,
						dataIndex: 'totalmem'
					}, {
						text: 'freemem',
						width: 70,
						sortable: true,
						dataIndex: 'freemem'
					}, {
						text: 'free/total',
						width: 70,
						sortable: true,
						dataIndex: 'free/total'
					}
				]
			}, {
				text: 'CPU(I/O)',
				columns: [{
						text: 'user',
						width: 60,
						sortable: true,
						dataIndex: 'cpu_user'
					}, {
						text: 'nice',
						width: 60,
						sortable: true,
						dataIndex: 'cpu_nice'
					}, {
						text: 'system',
						width: 60,
						sortable: true,
						dataIndex: 'cpu_system'
					}, {
						text: 'iowait',
						width: 60,
						sortable: true,
						dataIndex: 'cpu_iowait'
					}, {
						text: 'steal',
						width: 60,
						sortable: true,
						dataIndex: 'cpu_steal'
					}, {
						text: 'idle',
						width: 60,
						sortable: true,
						dataIndex: 'cpu_idle'
					}
				]
			}, {
				text: 'DISK(I/O)',
				columns: [{
						text: 'tps',
						width: 70,
						sortable: true,
						dataIndex: 'tps'
					}, {
						text: 'kb_read',
						width: 70,
						sortable: true,
						dataIndex: 'kb_read'
					}, {
						text: 'kb_wrtn',
						width: 70,
						sortable: true,
						dataIndex: 'kb_wrtn'
					}, {
						text: 'kb_read/s',
						width: 70,
						sortable: true,
						dataIndex: 'kb_read_per'
					}, {
						text: 'kb_wrtn/s',
						width: 70,
						sortable: true,
						dataIndex: 'kb_wrtn_per'
					}
				]
			}
		]
	});

	//chart of nodes' detailed
	var chartPanel = Ext.create('Ext.panel.Panel', {
		id: 'chartPanelNode',
		autoScroll: true,
		autoShow: true,
		region: 'center',
		items: [{
				layout: 'column',
				border: false,
				anchor: '95%',
				items: [{
						xtype: 'label',
						text: 'Chart:',
						margin: '10 0 0 10',
						//columnWidth: .10,
						//labelWidth: 60,
						//font: '18px'
					},
					serverCom, yaxisCom, intervalCom, {
						xtype: 'button',
						text: 'Reload Chart',
						handler: reloadHandler,
						width: 150,
						margin: '10 0 0 10'
					}
				]
			},
			_chart
		]
	});

	/**
	 * the overall layout
	 */
	var viewport = new Ext.Viewport({
		layout: 'border',
		items: [sysPanel, chartPanel]
	});

	list();
	refresh();
	run();
});

var refresh = function() {
	window.parent.client.request('systemInfo', null, function(err, msg) {
		if (err) {
			console.error('fail to request system info:');
			console.error(err);
			return;
		}

		// compose display data
		var data = [];
		for (var id in msg) {
			cacheNodeInfo[id] = cacheNodeInfo[id] || [];
			msg[id] = msg[id] || {};
			msg[id]['time'] = new Date();
			cacheNodeInfo[id].push(msg[id]);
			data.push(msg[id]);
		}
		var store = Ext.getCmp('gridPanelId').getStore();
		var cache = cacheNodeInfo[_serverId] || [];
		var __data = [];
		console.log(cache);
		var _id = map[_yaxisId];
		var yAxis = _chart.axes.get(0);
		var flag = 0;
		for (var i = 0; i < cache.length; i++) {
			__data.push({
				data1: parseFloat(cache[i][_id]),
				data2: new Date(cache[i]['time'])
			});

			if (cache[i][_id] > _ymax) {
				_ymax = cache[i][_id];
				flag = 1;
			}
		}

		if (flag) {
			yAxis.maximum = _ymax;
			_chart.redraw();
		}
		console.log('refresh %j', __data);
		store1.loadData(__data);
		store.loadData(data);
	});
}

/*
 * update the data of gkPanel
 */
var contentUpdate = function(system, cpu, start_time) {
	document.getElementById("system").innerHTML = system;
	document.getElementById("cpu").innerHTML = cpu;
	document.getElementById("start_time").innerHTML = start_time;
};

function reloadHandler() {
	if (_intervalId != Ext.getCmp('intervalComId').getValue()) {
		_intervalId = Ext.getCmp('intervalComId').getValue();
		console.log(_intervalId);
		clearInterval(seed);
		run(_intervalId);
	}
	_serverId = Ext.getCmp('serverComId').getValue();
	_yaxisId = Ext.getCmp('yaxisComId').getValue();
	_ymax = 0;
	var __data = [];

	var cache = cacheNodeInfo[_serverId] || [];

	var _id = map[_yaxisId];
	for (var i = 0; i < cache.length; i++) {
		__data.push({
			data1: parseFloat(cache[i][_id]),
			data2: new Date(cache[i]['time'])
		});

		if (cache[i][_id] > _ymax) {
			_ymax = cache[i][_id];
		}
	}

	var timeAxis = _chart.axes.get(1);
	var yAxis = _chart.axes.get(0);
	yAxis.title = _yaxisId;

	yAxis.maximum = _ymax;

	console.log(yAxis.maximum);
	timeAxis.step = [Ext.Date.MINUTE, _intervalId];
	timeAxis.toDate = new Date(timeAxis.fromDate.getTime() + _intervalId * 10 * 60 * 1000);
	_chart.redraw();
	store1.loadData(__data);
}

function run(interval_time) {
	interval_time = interval_time || 1;
	interval_time = interval_time * 60 * 1000;
	seed = setInterval(function() {
		refresh();
	}, interval_time);
}

var yaxis_array = ['loadavg(1m)', 'loadavg(5m)', 'loadavg(15m)', 'mem(free/total)',
		'cpu(usr)', 'cpu(nice)', 'cpu(system)', 'cpu(iowait)', 'cpu(steal)', 'cpu(idle)',
		'disk(tps)', 'disk(kb_read)', 'disk(kb_wrtn)', 'disk(kb_read/s)', 'disk(kb_wrtn/s)'
];
var interval_array = [1, 2, 3, 4, 5, 10, 20];
var _data = [];

var list = function() {
	window.parent.client.request('scripts', {
		command: 'list'
	}, function(err, msg) {
		if (err) {
			alert(err);
			return;
		}
		var servers = [],
			yaxis = [],
			interval = [],
			i, l, item;
		for (i = 0, l = msg.servers.length; i < l; i++) {
			item = msg.servers[i];
			servers.push({
				name: item,
				serverId: item
			});
		}


		for (i = 0, l = yaxis_array.length; i < l; i++) {
			item = yaxis_array[i];
			yaxis.push({
				name: item,
				yaxis: item
			});
		}

		for (i = 0, l = interval_array.length; i < l; i++) {
			item = interval_array[i];
			interval.push({
				name: item,
				interval: item
			});
		}

		servers.sort(function(o1, o2) {
			return o1.name.localeCompare(o2);
		});

		Ext.getCmp('serverComId').getStore().loadData(servers);
		Ext.getCmp('serverComId').setValue(servers[0]['name']);

		Ext.getCmp('yaxisComId').getStore().loadData(yaxis);
		Ext.getCmp('yaxisComId').setValue(yaxis[0]['name']);

		Ext.getCmp('intervalComId').getStore().loadData(interval);
		Ext.getCmp('intervalComId').setValue(interval[0]['name']);

		_serverId = Ext.getCmp('serverComId').getValue();
		_yaxisId = Ext.getCmp('yaxisComId').getValue();
		_intervalId = Ext.getCmp('intervalComId').getValue();

	});
};
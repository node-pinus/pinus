Ext.require('Ext.chart.*');
Ext.require('Ext.layout.container.Fit');
Ext.require(['Ext.data.*']);

var cacheNodeInfo = {};
var _serverId = "";
var _yaxisId = "";
var _intervalId = "";
var _chart = null;
var _vsz = 0;
var _rss = 0;
var _cpuavg = 0;
var seed = 0;
var _store1 = null;

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
        title: 'cpuAvg'
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

  var nodeStore = Ext.create('Ext.data.Store', {
    id: 'nodeStore',
    autoLoad: false,
    pageSize: 5,
    fields: ['time', 'serverId', 'serverType', 'pid', 'cpuAvg', 'memAvg', 'vsz', 'rss', 'usr', 'sys', 'gue'],
    proxy: {
      type: 'memory',
      reader: {
        type: 'json',
        root: 'nodes'
      }
    }
  });
  //nodes' detailed information
  var nodesPanel = Ext.create('Ext.grid.Panel', {
    id: 'nodesPanel',
    // title:'nodesInformation',
    region: 'north',
    store: nodeStore,
    autoScroll: true,
    height: 300,
    columns: [{
        xtype: 'rownumberer',
        width: 40,
        sortable: false
      }, {
        text: 'time',
        width: 150,
        sortable: true,
        dataIndex: 'time'
      }, {
        text: 'serverId',
        width: 150,
        sortable: true,
        dataIndex: 'serverId'
      }, {
        text: 'serverType',
        width: 80,
        sortable: true,
        dataIndex: 'serverType'
      }, {
        text: 'pid',
        width: 60,
        sortable: true,
        dataIndex: 'pid'
      }, {
        text: 'cpuAvg',
        width: 60,
        sortable: true,
        dataIndex: 'cpuAvg'
      }, {
        text: 'memAvg',
        width: 60,
        sortable: true,
        dataIndex: 'memAvg'
      }, {
        text: 'vsz',
        width: 80,
        sortable: true,
        dataIndex: 'vsz'
      }, {
        text: 'rss',
        width: 80,
        sortable: true,
        dataIndex: 'rss'
      }, {
        text: 'cpu(i/o)',
        columns: [{
            text: 'usr',
            width: 60,
            sortable: true,
            dataIndex: 'usr'
          }, {
            text: 'sys',
            width: 60,
            sortable: true,
            dataIndex: 'sys'
          }, {
            text: 'gue',
            width: 60,
            sortable: true,
            dataIndex: 'gue'
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

  var viewport = new Ext.Viewport({
    layout: 'border',
    items: [nodesPanel, chartPanel]
  });

  list();
  refresh();
  run();
});

function reloadHandler() {
  if (_intervalId != Ext.getCmp('intervalComId').getValue()) {
    _intervalId = Ext.getCmp('intervalComId').getValue();
    console.log(_intervalId);
    clearInterval(seed);
    run(_intervalId);
  }
  _serverId = Ext.getCmp('serverComId').getValue();
  _yaxisId = Ext.getCmp('yaxisComId').getValue();
  //_vsz = 0;
  //_rss = 0;
  //_cpuavg = 0;
  var __data = [];

  var cache = cacheNodeInfo[_serverId] || [];

  if (_yaxisId === 'cpu%') {
    _yaxisId = 'cpuAvg';
  }

  if (_yaxisId === 'mem%') {
    _yaxisId = 'memAvg';
  }

  for (var i = 0; i < cache.length; i++) {
    __data.push({
      data1: parseFloat(cache[i][_yaxisId]),
      data2: new Date(cache[i]['time'])
    });

    if (_yaxisId === 'vsz') {
      if (cache[i][_yaxisId] > _vsz) {
        _vsz = cache[i][_yaxisId];
      }
    }

    if (_yaxisId === 'rss') {
      if (cache[i][_yaxisId] > _rss) {
        _rss = cache[i][_yaxisId];
      }
    }

    if (_yaxisId === 'cpuAvg') {
      if (cache[i][_yaxisId] > _cpuavg) {
        _cpuavg = cache[i][_yaxisId];
      }
    }
  }

  var timeAxis = _chart.axes.get(1);
  var yAxis = _chart.axes.get(0);
  yAxis.title = _yaxisId;

  yAxis.maximum = 1.0;

  if (_yaxisId === 'vsz') {
    yAxis.maximum = _vsz;
  }

  if (_yaxisId === 'rss') {
    yAxis.maximum = _rss;
  }

  if (_yaxisId === 'cpuAvg') {
    yAxis.maximum = _cpuavg;
  }

  console.log(yAxis.maximum);
  timeAxis.step = [Ext.Date.MINUTE, _intervalId];
  timeAxis.toDate = new Date(timeAxis.fromDate.getTime() + _intervalId * 10 * 60 * 1000);
  _chart.redraw();
  store1.loadData(__data);
}

function refresh() {
  window.parent.client.request('nodeInfo', null, function(err, msg) {
    if (err) {
      console.error('fail to request node info:');
      console.error(err);
      return;
    }

    // compose display data
    var data = [];
    var yAxis = _chart.axes.get(0);
    for (var id in msg) {
      cacheNodeInfo[id] = cacheNodeInfo[id] || [];
      msg[id] = msg[id] || {};
      msg[id]['time'] = new Date();
      cacheNodeInfo[id].push(msg[id]);
      data.push(msg[id]);
    }
    var store = Ext.getCmp('nodesPanel').getStore();
    var cache = cacheNodeInfo[_serverId] || [];
    var __data = [];
    var flag = 0;
    for (var i = 0; i < cache.length; i++) {
      var _t = parseFloat(cache[i][_yaxisId]);
      if (_t > yAxis.maximum) {
        yAxis.maximum = _t;
        flag = 1;
      }
      __data.push({
        data1: _t,
        data2: new Date(cache[i]['time'])
      });
    }
    if (flag) {
      _chart.redraw();
    }
    console.log('refresh %j', __data);
    store1.loadData(__data);
    store.loadData(data);
  });
}

function run(interval_time) {
  interval_time = interval_time || 1;
  interval_time = interval_time * 60 * 1000;
  seed = setInterval(function() {
    refresh();
  }, interval_time);
}

var yaxis_array = ['cpuAvg', 'memAvg', 'vsz', 'rss', 'usr', 'sys', 'gue'];
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

    if (_yaxisId === 'cpu%') {
      _yaxisId = 'cpuAvg';
    }

    if (_yaxisId === 'mem%') {
      _yaxisId = 'memAvg';
    }
  });
};
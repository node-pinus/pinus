Ext.require([
    'Ext.grid.*',
    'Ext.data.*',
    'Ext.form.*',
    'Ext.tip.QuickTipManager'
]);

Ext.define('Log', {
    extend: 'Ext.data.Model',
    idProperty: 'traceId',
    fields: [
        {name: 'traceId', type: 'string'},
        {name: 'seq', type: 'int'},
        {name: 'role', type: 'string'},
        {name: 'remote', type: 'string'},
        {name: 'module', type: 'string'},
        {name: 'method', type: 'string'},
    ]
});

Ext.onReady(function(){

    Ext.tip.QuickTipManager.init();
    
    var store = Ext.create('Ext.data.Store', {
        model: 'Log',
        sorters: {property: 'seq', direction: 'ASC'},
        groupField: 'traceId'
    });

    var cellEditing = Ext.create('Ext.grid.plugin.CellEditing', {
        clicksToEdit: 1,
        listeners: {
            edit: function(){
                // refresh summaries
                grid.getView().refresh();
            }
        }
    });
    var showSummary = true;
    var grid = Ext.create('Ext.grid.Panel', {
        id: 'rpcDebugGrid',
        frame: true,
        title: 'RPC Debug Log',
        iconCls: 'icon-grid',
        renderTo: document.body,
        store: store,
        plugins: [cellEditing],
        dockedItems: [{
            dock: 'top',
            xtype: 'toolbar',
            items: [
              'number: ',
              { 
                xtype:'numberfield',
                name:'numberfield',
                id:'numberfieldId',
                anchor: '100%',
                value: 1000,
                maxValue: 100000,
                minValue: 0,
                width:100
              },' ',
              {
                tooltip: 'refresh view',
                text: 'refresh',
                handler: refreshDate
              }]
        }],
        features: [{
            id: 'group',
            ftype: 'groupingsummary',
            groupHeaderTpl: '{name}',
            hideGroupedHeader: true,
            enableGroupingMenu: false
        }],
        columns: [{
            text: 'id',
            sortable: true,
            dataIndex: 'seq',
            flex: 1,
            hideable: false
        }, {
            header: 'Project',
            width: 20,
            sortable: true,
            dataIndex: 'traceId'
        }, {
            header: 'role',
            width: 50,
            dataIndex: 'role'
        }, {
            header: 'source',
            width: 120,
            dataIndex: 'source'
        }, {
            header: 'remote',
            width: 120,
            dataIndex: 'remote'
        }, {
            header: 'module',
            width: 150,
            dataIndex: 'module'
        }, {
            header: 'method',
            width: 80,
            dataIndex: 'method'
        }, {
            header: 'arguments',
            width: 450,
            dataIndex: 'args',
            renderer: function(value, metaData, record, rowIdx, colIdx, store, view){
                return JSON.stringify(value);
            }
        }, {
            header: 'timestamp',
            width: 100,
            dataIndex: 'timestamp',
            renderer: function(value, metaData, record, rowIdx, colIdx, store, view){
                return format(value);
            }
        }, {
            header: 'description',  
            width: 240,  
            dataIndex: "description",  
        }]
    });
    refreshDate();
});

function refreshDate() {
   var number = Ext.getCmp('numberfieldId').getValue();
   console.log('number: %s', number);
   window.parent.client.request('rpcDebug', {limit: number}, function(err, msg) {
    if(!!err) {
      console.error('fail to request scene info:' + err);
      return;
    }
    var store = Ext.getCmp('rpcDebugGrid').getStore();
    store.loadData(msg);
  });
}; 

function format(date, format) {
  date = new Date(date);
  format = format || 'MM/dd hh:mm';
  var o = {
    "M+":date.getMonth() + 1, //month
    "d+":date.getDate(), //day
    "h+":date.getHours(), //hour
    "m+":date.getMinutes(), //minute
    "s+":date.getSeconds(), //second
    "q+":Math.floor((date.getMonth() + 3) / 3), //quarter
    "S":date.getMilliseconds() //millisecond
  };

  if (/(y+)/.test(format)) {
    format = format.replace(RegExp.$1,
      (date.getFullYear() + "").substr(4 - RegExp.$1.length));
  }

  for (var k in o) {
    if (new RegExp("(" + k + ")").test(format)) {
      format = format.replace(RegExp.$1, RegExp.$1.length === 1 ? o[k] :
        ("00" + o[k]).substr(("" + o[k]).length));
    }
  }
  return format;
};

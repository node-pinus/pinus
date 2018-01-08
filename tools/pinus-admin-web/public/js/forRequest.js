Ext.require('Ext.chart.*');
Ext.onReady(function(){

	Ext.BLANK_IMAGE_URL ='../ext-4.0.7-gpl/resources/themes/images/default/tree/s.gif'; 
	
   var forStore = Ext.create('Ext.data.Store', {
	id:'forStoreId',
	autoLoad:false,
	pageSize:5,
    fields:['serverId','timeUsed','source','route','params','createTime','doneTime','cost(ms)','time'],
    proxy: {
        type: 'memory',
        reader: {
            type: 'json',
            root: 'requests'
        }
    }
});
    var serverStore = Ext.create('Ext.data.Store', {
		fields: ['name', 'serverID']
	});

    var serverCom = Ext.create('Ext.form.ComboBox', {
		id:'serverComId', 
		fieldLabel: 'Server',
		labelWidth: 60,
		store: serverStore,
		queryMode: 'local',
		displayField: 'serverID',
		valueField: 'name'
	});

/**
 * gridPanel,detail message
 */
var forGrid=Ext.create('Ext.grid.Panel', {
	id:'forGridId',
	region:'center',
    store: forStore,
    columns:[
		// {header:'source',dataIndex:'source',width:150},
		{xtype:'rownumberer',width:40,sortable:false},
		{text:'time',dataIndex:'time',width:130},
		{text:'serverId',width:130,dataIndex:'serverId'},
		{text:'request route',dataIndex:'route',width:220},
		{text:'timeUsed',dataIndex:'timeUsed',width:70},
		{text:'request params',dataIndex:'params',width:900}
//		{header:'createTime',dataIndex:'createTime',width:200},
//		{header:'doneTime',dataIndex:'doneTime',width:200},
//		{header:'cost(ms)',dataIndex:'cost(ms)',width:800}
//		{header:'state',dataIndex:'state'}
		],
	tbar:[
		 'number: ',{
		 	xtype:'numberfield',
		 	name:'numberfield',
		 	id:'numberfieldId',
		 	anchor: '100%',
		 	value: 10,
        	maxValue: 1000,
        	minValue: 0,
		 	width:100
		 },' ',
		 // {
		 // 	xtype:'button',
		 // 	text:'latest 100logs',
		 // 	handler:getLatest
		 // },' ',
		 {
		 	xtype:'button',
		 	text:'refresh',
		 	handler:refresh
		 },
		 serverCom
		]
});
forGrid.addListener('itemdblclick', function(forGrid, rowindex, e){
	var theGrid=Ext.getCmp('conGridId');
	var record=forGrid.getSelectionModel().getSelection();
	if(record.length>1){
		alert('only one data is required!');
		return;
	}
	if(record.length<1){
		alert('please choose one data!')
	}
	var data=record[0].data.params;
	gridDetailShow(data);
});
var countStore=Ext.create('Ext.data.Store',{
	id:'countStoreId',
	autoLoad:false,
	pageSize:5,
	fields:['route','totalCount','maxTime','minTime','avgTime'],
	proxy:{
		type:'memory',
		reader:{
			type:'json',
			root:'countData'
		}
	}
});
var countGrid=Ext.create('Ext.grid.Panel',{
	id:'countGridId',
	region:'south',
	store:countStore,
	height:150,
	columns:[
		{xtype:'rownumberer',width:40,sortable:false},
		{text:'request route',dataIndex:'route',width:200},
		{text:'totalCount',dataIndex:'totalCount',width:70},
		{text:'maxTime',dataIndex:'maxTime',width:70},
		{text:'minTime',dataIndex:'minTime',width:70},
		{text:'avgTime',dataIndex:'avgTime',width:200}
	]
});
var viewport=new Ext.Viewport({
	    layout:'border',
	    items:[forGrid,countGrid]
	});
	refresh();
});

function refresh(){
	var number = Ext.getCmp('numberfieldId').getValue();
	var serverId = Ext.getCmp('serverComId').getValue();
	if(!number || !serverId){
		list();
		return;
	}
   window.parent.client.request('monitorLog', {number:number,logfile:'forward-log',serverId:serverId} , function(err, msg) {
    if(err) {
      console.error('fail to request forwardLog info:');
      console.error(err);
      return;
    }
 
    // compose display data
    var data = [];
    var _msg = msg.body.dataArray;
    for(var i=0;i<_msg.length;i++){
    	data.push({
    		time : _msg[i].time,
    		serverId : _msg[i].serverId,
    		route : _msg[i].route,
    		timeUsed : _msg[i].timeUsed,
    		params : _msg[i].params
    	});
    }
    var store = Ext.getCmp('forGridId').getStore();
    store.loadData(data);
    list();
  });
}	
	
var list = function() {
	window.parent.client.request('scripts', {command: 'list'}, function(err, msg) {
		if(err) {
			alert(err);
			return;
		}
		console.log(msg);
		var servers = [], scripts = [], i, l, item;
		for(i=0, l=msg.servers.length; i<l; i++) {
			item = msg.servers[i];
			servers.push({name: item, serverID: item});
		}

		servers.sort(function(o1, o2) {
			return o1.name.localeCompare(o2);
		});

		Ext.getCmp('serverComId').getStore().loadData(servers);
	});
};	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	

Ext.onReady(function(){

	Ext.BLANK_IMAGE_URL ='../ext-4.0.7-gpl/resources/themes/images/default/tree/s.gif'; 
	
var rpcStore = Ext.create('Ext.data.Store', {
	id:'reqStoreId',
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

//server comboBox
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
var rpcGrid=Ext.create('Ext.grid.Panel', {
	id:'rpcGridId',
	region:'center',
    store: rpcStore,
    columns:[
		// {header:'source',dataIndex:'source',width:150},
		{xtype:'rownumberer',width:40,sortable:false},
		{text:'time',dataIndex:'time',width:130},
		{text:'serverId',dataIndex:'serverId',width:130},
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
	 },{
	 	xtype:'button',
	 	text:'refresh',
	 	handler:refresh
	 },serverCom
	]
});
rpcGrid.addListener('itemdblclick', function(rpcGrid, rowindex, e){
	var theGrid=Ext.getCmp('conGridId');
	var record=rpcGrid.getSelectionModel().getSelection();
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
	    items:[rpcGrid,countGrid]
	});
	refresh();
});
//refresh conGrid's data


// function count(){
// 	if(rpcLogData.length<1){
// 		return;
// 	}
// 	var maxTime=rpcLogData[0].timeUsed;
// 	var minTime=rpcLogData[0].timeUsed;
// 	var totalTime=0;
//     for(var i=1;i<rpcLogData.length;i++){
//     	var data=rpcLogData[i].timeUsed;
//     	if(data<=minTime){minTime=data};
//     	if(data>=maxTime){maxTime=data};
//     	totalTime+=data;
//     }
// 	document.getElementById("totalCountId").innerHTML=rpcLogData.length;
// 	document.getElementById("maxTimeId").innerHTML=maxTime;
// 	document.getElementById("minTimeId").innerHTML=minTime;
// 	document.getElementById("avgTimeId").innerHTML=totalTime/rpcLogData.length;
// }
//{number:5,logfile:'rpc-log',serverId:"area-server-1"}
function refresh(){
	var number = Ext.getCmp('numberfieldId').getValue();
	var serverId = Ext.getCmp('serverComId').getValue();
	console.log(number);
	console.log(serverId)
	if(!number || !serverId){
		list();
		return;
	}
   window.parent.client.request('monitorLog', {number:number,logfile:'rpc-log',serverId:serverId} , function(err, msg) {
    if(err) {
      console.error('fail to request monitorLog info:');
      console.error(err);
      return;
    }
    console.log(msg);
 
    // compose display data
    var data = [];
    /*for(var id in msg) {
    	for(var i=0;i<msg[id].length;i++){
    		data.push({
		      	serverId : id,
		      	name : msg[id][i]['name'],
		      	kindName : msg[id][i]['kindName'],
		      	position : '('+msg[id][i].x+','+msg[id][i].y+')'
		    });
    	}
    }*/
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
    var store = Ext.getCmp('rpcGridId').getStore();
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
		//Ext.getCmp('scriptComId').getStore().loadData(scripts);
	});
};	

	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	

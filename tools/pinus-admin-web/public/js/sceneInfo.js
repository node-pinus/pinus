Ext.onReady(function(){

	Ext.BLANK_IMAGE_URL ='../ext-4.0.7-gpl/resources/themes/images/default/tree/s.gif'; 
	
   var sceneStore = Ext.create('Ext.data.Store', {
	id:'sceneStoreId',
	autoLoad:false,
	pageSize:5,
    fields:['name','kindName','position','serverId'],
    proxy: {
        type: 'memory',
        reader: {
            type: 'json',
            root: 'requests'
        }
    }
});
/**
 * userGrid,detail users' message
 */
var sceneGrid=Ext.create('Ext.grid.Panel', {
	id:'sceneGridId',
	region:'center',
    store: sceneStore,
    columns:[
		{xtype:'rownumberer',width:50,sortable:false},
		{text:'serverId',width:120,dataIndex:'serverId'},
		{text:'name',dataIndex:'name',width:100},
		{text:'kindName',dataIndex:'kindName',width:100},
		{text:'position',dataIndex:'position',width:400}
		],
	 tbar:[{
          xtype:'button',
          text:'refresh',
          handler:refresh
         }]
});
var viewport=new Ext.Viewport({
	    layout:'border',
	    items:[sceneGrid]
	});
	refresh();
});

function refresh(){
   window.parent.client.request('sceneInfo', null, function(err, msg) {
    if(err) {
      console.error('fail to request scene info:');
      console.error(err);
      return;
    }
 
    // compose display data
    var data = [];
    for(var id in msg) {
    	for(var i=0;i<msg[id].length;i++){
    		data.push({
		      	serverId : id,
		      	name : msg[id][i]['name'],
		      	kindName : msg[id][i]['kindName'],
		      	position : '('+msg[id][i].x+','+msg[id][i].y+')'
		    });
    	}
    }
    var store = Ext.getCmp('sceneGridId').getStore();
    store.loadData(data);
  });
}	
	

	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	

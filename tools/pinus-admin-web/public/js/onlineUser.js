Ext.onReady(function(){

	Ext.BLANK_IMAGE_URL ='../ext-4.0.7-gpl/resources/themes/images/default/tree/s.gif'; 
	
	var userStore = Ext.create('Ext.data.Store', {
		id:'userStoreId',
		autoLoad:false,
		pageSize:5,
		fields:['serverId','username','loginTime','uid','address'],
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
	var userGrid=Ext.create('Ext.grid.Panel', {
		id:'userGridId',
		region:'center',
	    store: userStore,
	    columns:[
			{xtype:'rownumberer',width:50,sortable:false},
			{text:'服务Id',width:150,dataIndex:'serverId'},
			{text:'用户名',dataIndex:'username',width:100},
			{text:'用户id',dataIndex:'uid',width:200},
			{text:'客户端地址',dataIndex:'address',width:200},
			{text:'登录时间',dataIndex:'loginTime',width:200}
		]
	});

	var viewport=new Ext.Viewport({
		layout:'border',
		items:[{
			region:'north',
			height:30,
			contentEl:onlineUsersInfo
		}, userGrid]
	});
});

var STATUS_INTERVAL = 5 * 1000; // 60 seconds
/*
socket.on('connect', function(){
	socket.emit('announce_web_client');
	socket.emit('webMessage', {method: 'getOnlineUser'});

	socket.on('getOnlineUser',function(msg){  
		var totalConnCount = msg.totalConnCount;
		var loginedCount = msg.loginedCount;
		var onlineUserList = msg.onlineUserList
		var store = Ext.getCmp('userGridId').getStore();
		contentUpdate(totalConnCount, loginedCount);
		store.loadData(onlineUserList);
	});
});*/

Date.prototype.Format = function (fmt) { //author: meizz
    var o = {
        "M+": this.getMonth() + 1, //月份
        "d+": this.getDate(), //日
        "h+": this.getHours(), //小时
        "m+": this.getMinutes(), //分
        "s+": this.getSeconds(), //秒
        "q+": Math.floor((this.getMonth() + 3) / 3), //季度
        "S": this.getMilliseconds() //毫秒
    };
    if (/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
    for (var k in o)
        if (new RegExp("(" + k + ")").test(fmt)) fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
    return fmt;
}

setInterval(function() {
	window.parent.client.request('onlineUser', null, function(err, msg) {
		if(err) {
			console.error('fail to request online user:');
			console.error(err);
			return;
		}

		var totalConnCount = 0, loginedCount = 0, info, list = [];
		msg = msg.body;
		for(var sid in msg) {
			info = msg[sid];

			//totalConnCount += msg[sid].totalConnCount;
			//loginedCount += msg[sid].loginedCount;

            totalConnCount += msg[sid].loginedCount;

			var users = {};
			var lists = msg[sid].loginedList;
			if(lists)
				for(var i=0;i<lists.length;i++){
					var username = lists[i].uid.split('<-->')[0];
					if(!users[username]) {
                        users[username] = 1;
                        loginedCount++;
                    }
					list.push({
						address : lists[i].address,
						serverId : sid,
						username : username,
						loginTime : new Date(lists[i].loginTime).Format("yyyy-MM-dd hh:mm:ss"),
						uid : lists[i].uid
					});
				}
		}

		contentUpdate(totalConnCount, loginedCount);

		var store = Ext.getCmp('userGridId').getStore();
		console.log(list);
		store.loadData(list);
	});
}, STATUS_INTERVAL);

function contentUpdate(totalConnCount, loginedCount){
	document.getElementById("totalConnCount").innerHTML = totalConnCount;
	document.getElementById("loginedCount").innerHTML = loginedCount;
}
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	

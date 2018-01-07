var _node = {Node: Node};

var WebClient = function(io) {
  this.nodes = {};
  this.ids = {};
  this.streams = {};
  this.count = 0;
	this.detailTimer = false;
  this.histories = {};
  this.stats = { messages:0,nodes:0,start:new Date()};
  this.connected = false;
  var wc = this;
  this.socket = io.connect('http://'+window.location.hostname+':8888');
  this.socket.on('connect', function() {
    wc.connected = true;
    wc.socket.emit('announce_web_client');
		var REPORT_INTERVAL = 3 * 1000;
		setInterval(function() {
			wc.socket.emit('webreport',{});
		},REPORT_INTERVAL);

		var detailId = setInterval(function() {
			if (!!wc.detailTimer) {
				wc.socket.emit('detailreport',{});
			}
		},REPORT_INTERVAL);

  });

  var isInited = false;
  // Add a new Node to pool
  this.socket.on('add_node', function(message) {
  	console.log(JSON.stringify(message));
  	var nodeId = message.nodeId;
  	var iport = message.iport;
  		if (!wc.ids[nodeId]){
  			wc.add_node(nodeId,iport);
  			wc.ids[nodeId] = nodeId;
  			showUI('block');
  		} else {
  			console.log('duplicated server add ' + nodeId);
  		}
  });
  
  // Remove Node from pool
  this.socket.on('remove_node', function(message) {
    wc.remove_node(message.node);
  });
  //report status
  this.socket.on('webreport', function(snum,suser,stimeData,sincrData) {
  	//doReport(timeData);
    $('#agentinput').val(snum);
    $('#maxuserinput').val(suser);
    updateIncrData(sincrData);
    updateTimesData(snum,suser,stimeData);
  });
  
  this.socket.on('detailreport', function(message) {
			doReportDetail(message);
  });

  /* temporary code */
  this.socket.on('error', function(message) {
      $("#errorinput").html('['+message.node + ']:'+ message.error).end();
  });
  /* temporary code */

  this.socket.on('statusreport', function(message) {
  	var nodeId = message.id;
		var status = message.status;
		var hit = '';
		if (status===0) { hit = 'IDLE'; } 
		if (status==1) { hit = 'READY';$('#run-button').css('display','') }
		if (status==2) { hit = 'RUNNING';$('#run-button').css('display','none')};
  	$("#hitdiv").html(hit);
  });
  
  // Update total message count stats
  this.socket.on('stats', function(message) {
    if (!wc.stats.message_offset) {
      wc.stats.message_offset = message.message_count;
    }
    wc.stats.messages = message.message_count - wc.stats.message_offset;
  });

};

function doReportDetail(msg){
	updateDetailAgent(msg.detailAgentSummary,' Summary');
	updateAvgAgent(msg.detailAgentAvg,' Response Time');
	updateEveryAgent(msg.detailAgentQs,'qs_div',' Qps Time');
}


function doReport(message){
	updateMain(message.globaldata);
	return ;
}

function showUI(value){
	//$("#run-button").css('display',value);
	//$("#runcode-button").css('display',value);
	//$("#codeinput").css('display',value);
}

WebClient.prototype = {
  add_node: function(nodeId,iport) {
    var node = new _node.Node(nodeId,iport,this);
    node.render();
    var nodeId = nodeId;
    this.nodes[nodeId] = node;
    this.stats.nodes++;
    if (this.stats.nodes>=parseInt($('#agentinput').val())){
    	$('#ready-button').val('ReReady');
    	$('#run-button').show();
    } else {
    	$('#ready-button').val('Readying');
    	$("#run-button").css('display','none');
    }
  },

  remove_node: function(nodeId) {
    var node = this.nodes[nodeId];
    if (!!node) {
    	node.destroy();
    	delete this.nodes[node.nodeId];
    }
    this.stats.nodes--;
    if (this.stats.nodes<=0){
    	showUI('none');
    	this.stats.nodes = 0;
    }
    delete this.ids[nodeId];
  },

  // Resize screens, defined in web_client.jquery.js
  resize: function() { throw Error("WebClient.resize() not defined"); },
 
};

// Export for nodeunit tests
try {
  exports.WebClient = WebClient;
} catch(err) {
	
};

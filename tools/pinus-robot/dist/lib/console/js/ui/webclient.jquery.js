/*  
 * Instantiates WebClient(), binds document.ready()
 */

var web_client = new WebClient(io);

var REPORT_INTERVAL = 1000;

// Update statistics widget
setInterval(function() {
  var now = new Date();
  var elapsed = (now.getTime() - web_client.stats.start.getTime()) / 1000;
  var minutes = parseInt(elapsed / 60);
  var seconds = parseInt(elapsed % 60);
  var rate = web_client.stats.messages/elapsed;
  $("#stats")
    .find(".nodes b").html(web_client.stats.nodes).end()
    .find(".elapsed b").html(minutes + ":" + (seconds < 10 ? "0" : "") + seconds).end();
    //.find(".summary b").html((rate).toFixed(2));
},REPORT_INTERVAL);


function jsonToTable(json) {
    var txt = "";
    for ( var i in json) {
      var ele = json[i];
      txt += "<tr><td class=label>" + ele.key + "</td><td>" + ele.max + "</td><td>" + ele.min + "</td><td>" + Math.round(ele.avg) + "</td><td>" + Math.round(ele.qps) + "</td><td>" + ele.num + "</td></tr>";
    }
    return txt;
};

var updateIncrData = function(sincrData){
    var incrData = {};
    for (var agent  in sincrData) {
    var params = sincrData[agent];
      for (var key in params) {
        incrData[key] = incrData[key]==null?params[key]:incrData[key]+params[key];
      }
    }
    var incrHTML = "";
    for (var key in incrData){
        incrHTML +=key+ ":(" + incrData[key] + ') ';
    }
    $('#errorinput').html(incrHTML);
}

var gdata = {};

var updateTimesData = function(agent,user,stimeData){
    var conns = agent;
    var act = {};
    var summary = {};
    for (var agent  in stimeData) {
      var params = stimeData[agent];
      for (var key in params) {
        act[key] = {};
        summary[key] = null;
      }
    }
    for (var key in act) {
        for (var agent  in stimeData) {
          var params = stimeData[agent];
          var single = params[key];
          if (!single) continue;
          var exist = summary[key];
          if (!exist){
            summary[key] = {key:key,min:single.min,max:single.max,avg:single.avg,num:single.num};
            summary[key].qps = 1000/single.avg*conns;
          } else {
            if (single.min<exist.min) {
              exist.min = single.min;
            }
            if (single.max>exist.max) {
              exist.max = single.max;
            }
            var num = exist.num+single.num;
            exist.avg = (exist.avg*exist.num + single.avg*single.num)/num;
            exist.qps = 1000/exist.avg*conns;
            exist.num = num;
          }
        }
    };
  var sortSum = _.sortBy(summary,function(ele){ return -1*(ele.num); });
  for (var index in sortSum) {
    var ex = sortSum[index];
    var key = ex.key;
    var columns = [key,'avg','min','max','qps'];
    var grow = gdata[key] || [];
    var last = grow[grow.length-1];
    if (!last || last[0]!==ex.num) {
      grow.push([ex.num,ex.avg,ex.min,ex.max,ex.qps]);
    } 
    gdata[key] = grow;
    var qpschart = {};
    qpschart.columns = columns;
    qpschart.rows = grow;
    qpschart.uid = key;
    updateGraph(qpschart,key);
  }
  document.getElementById("reportSummary").innerHTML = jsonToTable(sortSum);
  return;
}

var gavgrows = [];
var gqpsrows = [];

// Event bindings, main method
$(document).ready(function() {
  var bottom_height = $(".stat:first").height();
  var bar_height = $(".bar:first").height();

  // Calculate individual screen size
  function calc_screen_size(scount) {
    if (!scount) { scount = $("#screens .screen").length; }
    var ssize = (($(window).height() - bottom_height - 20) / scount)
      - (bar_height + 53);
    return ssize;
  }
  
  // Resize screens
  web_client.resize = function(scount, resize_bottom) {
    if (!resize_bottom) { resize_bottom = true; }
    //$("#controls2, #right").height($(window).height());
    //$(".console").height(calc_screen_size(scount));
    var screen_width = $(window).width() - $("#controls2").width();
    $("#right" + (resize_bottom ? ", #bottom" : ""))
      .width(screen_width).css('max-width', screen_width);
  };
  $(window).resize(function() {
    web_client.resize();
  });

	//$("#run-button").css('display','none');
	$("#runcode-button").css('display','none');
	$("#codeinput").css('display','none');
	
  web_client.resize();
  
  $("#ready-button").click(function() {
      web_client.stats = {messages: 0, nodes: 0, start:new Date()};
      web_client.socket.emit('exit4reready');
  		var agent = $("#agentinput").val();
  		var user = $("#maxuserinput").val();
  		var message = {agent:agent,maxuser:user};
  		web_client.socket.emit('ready',message);
  		$(this).attr('disable',true);
  		$('#conndiv').html('');
  		$('#run-button').css('display','none');
  });
  
  $("#run-button").click(function() {
		var agent = $("#agentinput").val();
		var maxuser = $("#maxuserinput").val();
    var script = $("#robotinput").val();
		var message = {agent:agent,maxuser:maxuser,script:script};
		web_client.socket.emit('run',message);
    gdata = {};
    $("#avg_div").html('');
		$("#hitdiv").html('Running...');
  	$('#run-button').css('display','none');
    $("#errorinput").html('');
  });
  
  $("#sumbtn").click(function() {
		web_client.detailTimer = true;
  	showDetailAgent();
  });
  
  $("#avgbtn").click(function() {
		web_client.detailTimer = true;
  	showDetailAgentAvg();
  });
  
  $("#qsbtn").click(function() {
		web_client.detailTimer = true;
  	showDetailAgentQs();
  });

});

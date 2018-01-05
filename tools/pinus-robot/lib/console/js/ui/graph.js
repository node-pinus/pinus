var graphs = {};

function updateGraph(chart,targetName) {
	var main = document.getElementById(targetName);
	if (!main) {
		var tname = targetName+'div';
		var _dom = $("#avg_template").clone().attr('id',tname).find('.screen-label').html(targetName+' Response Time Graph').end().find('.cgraphdiv').attr('id',targetName).end();
		$("#graph_div").append(_dom);
		main = document.getElementById(targetName);
		var p = $('#'+tname);
		p.find('.screen-buttons').click(function(){
			//var t = 
			p.find('.console').toggle();
			//p.find('.console').hide();
			//p.css('height','26px');
		});

	};
	if (graphs[chart.uid]) {
		graphs[chart.uid].updateOptions({
			"file" : chart.rows,
			labels : chart.columns
		});
	} else {
		var newchart = document.createElement("div");
		newchart.setAttribute("class", "post");
		newchart.innerHTML = []
				.concat( '<div style="width:100%;float:left">',
						'<div id="chart', chart.uid, '" style="float:left;width:92%;height:200px;"></div>',
						'<div id="chartlegend', chart.uid, '" style="float:left;width:80px;height:200px;"></div>',
						'</div>').join('');
		main.appendChild(newchart);
		graphs[chart.uid] = new Dygraph(document.getElementById("chart"
				+ chart.uid), chart.rows, {
			labelsDiv : document.getElementById("chartlegend" + chart.uid),
			labelsSeparateLines : true,
			labels : chart.columns
		});
	}

}

var sumshow = 'none';

function updateDetailAgent(_totalAgentSum,title){
	for (var agent in _totalAgentSum) {
		var target = $("#sum_"+agent);
		if (!!target.html()) {target.remove();};
		var _summary = _totalAgentSum[agent];
		var _dom = $("#table_template").clone()
		.find(".summary").html(jsonToTable(_summary)).end().attr("id", "sum_" + agent);
		_dom.find(".screen-label").html(agent + title);
    $("#summary_div").append(_dom);
  };
  $(".close").click(function() {
  	var self = $(this).parent().parent().parent().parent().css('display','none');
 });
};

function showDetailAgent(){
	sumshow = '';
	$("#summary_div").css('display',sumshow);
	$("#table_img").css('display',sumshow);
	$("#table_img").click(function(){
		sumshow = 'none';
		$(this).css('display',sumshow);
		$("#summary_div").css('display',sumshow);
	});
};


function updateAvgAgent(everyAgentavgDatas,title){
	for (var index in everyAgentavgDatas) {
		var chart = everyAgentavgDatas[index];
		var uid = chart.uid;
		var target = $("#avg_"+uid);
		if (!!target.html()) {
		} else {
			var _dom = $("#avg_template").clone().attr("id", "avg_" + uid);
			_dom.find(".screen-label").html(uid.substring(3,uid.length)+title);
			_dom.find(".avgrestime").attr("id", "davg_" + uid);
			_dom.css('display','block');
			$("#avg_div").append(_dom);
		};
    updateGraph(chart,"davg_"+uid);
  };
};

var avgshow = 'none';

function showDetailAgentAvg(){
	avgshow = '';
	$("#avg_div").css('display',avgshow);
	$("#avg_img").css('display',avgshow);
	$("#avg_img").click(function(){
		avgshow = 'none';
		$(this).css('display',avgshow);
		$("#avg_div").css('display',avgshow);
	});
};

var qsshow = 'none';

function showDetailAgentQs(){
	qsshow = '';
	$("#qs_div").css('display',qsshow);
	$("#qs_img").css('display',qsshow);
	$("#qs_img").click(function(){
		qsshow = 'none';
		$(this).css('display',qsshow);
		$("#qs_div").css('display',qsshow);
	});
};

function updateEveryAgent(everyAgentavgDatas,divname,title){
	for (var index in everyAgentavgDatas) {
		var chart = everyAgentavgDatas[index];
		var uid = chart.uid;
		var target = $("#qs_"+uid);
		if (!!target.html()) {
		} else {
			var _dom = $("#avg_template").clone().attr("id", "qs_" + uid);
			_dom.find(".screen-label").html(uid.substring(2,uid.length)+title);
			_dom.find(".avgrestime").attr("id", "dqs_" + uid);
			$("#qs_div").append(_dom);
		};
    updateGraph(chart,"dqs_"+uid);
  };
  $(".close").click(function() {
  	var self = $(this).parent().parent().parent().parent().css('display','none');
 });
};


function updateEveryAgent1(everyAgentqsDatas,divname,title){
	for (var index in everyAgentqsDatas) {
		var chart = everyAgentqsDatas[index];
		var uid = chart.uid;
		var target = $("#"+uid);
		if (!!target.html()) {
		} else {
			var _dom = $("#avg_template").clone();
			_dom.find(".screen-label").html(uid +' ' + title);
			_dom.find(".avgrestime").attr("id", uid);
			_dom.css('display','block');
			$("#" + divname).append(_dom);
		};
    //target = $();
    updateGraph(chart,uid);
  };
  $(".close").click(function() {
  	var self = $(this).parent().parent().parent().parent().css('display','none');
 });
};

//update([{"name":"","uid":0,"summary":
//{"Load Data uniques uniqs":2000},"charts":{"latency":{"name":"","uid":22,"columns":["time","min","max","avg","median","95%","99%"],"rows":[[0.03,0,0,0,0,0,0],[0.03,5,92,27.5,26,45,75],[0.04,6,62,26,25,45,57]]}}}]);

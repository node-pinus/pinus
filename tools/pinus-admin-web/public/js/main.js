/**
 * @author lwj Admin Console
 */
var centerPanel = '';
Ext.onReady(function() {
	Ext.BLANK_IMAGE_URL = '../ext-4.0.7-gpl/resources/themes/images/default/tree/s.gif';
	// Ext.BLANK_IMAGE_URL =
	// 'http://www.cnblogs.com/ext4/resources/images/default/s.gif';

	var treeStore = Ext.create('Ext.data.TreeStore', {
		root: {
			expanded: true,
			children: [{
				id: 'systemInfo',
				text: '系统信息',
				leaf: true
			}, {
				id: 'nodeInfo',
				text: '进程信息',
				leaf: true
			},
			// {id:'romote',text:'romote',leaf:true},
			{
				id: 'qq',
				text: '请求',
				expanded: true,
				children: [{
					id: 'conRequest',
					text: '连接请求',
					leaf: true
				}, {
					id: 'rpcRequest',
					text: 'Rpc调用',
					leaf: true
				}, {
					id: 'forRequest',
					text: '转发请求',
					leaf: true
				}]
			}, {
				id: 'onlineUser',
				text: '在线用户',
				leaf: true
			}, {
				id: 'sceneInfo',
				text: '场景信息',
				leaf: true
			}, {
				id: 'scripts',
				text: '脚本',
				leaf: true
			}, {
				id: 'rpcDebug',
				text: 'RPC调试',
				leaf: true
			}/*, {
				id: 'profiler',
				text: 'Profiler',
				leaf: true
			}*/]
		}
	});

	// admin consle menu----------------------------------------------------
	var westpanel = Ext.create('Ext.tree.Panel', {
		title: '菜单',
		region: 'west',
		width: 150,
		store: treeStore,
		enableDD: true,
		rootVisible: false,
		listeners: {
			'itemclick': function(view, re) {
				var title = re.data.text;
				var id = re.data.id;
				var leaf = re.data.leaf;
				if (!leaf) {
					return;
				}
				if (id === 'profiler') {
					var url = '/front/inspector.html?host=' + window.location.hostname + ':2337&page=0';
				} else {
					var url = '/module/' + id + '.html';
				}
				addIframe(title, url, id);

			}
		}
	});

	// center Panel----------------------------------------------------
	centerPanel = new Ext.create('Ext.tab.Panel', {
		region: 'center',
		deferredRender: false,
		border: false,
		activeTab: 0
	});
	var viewport = new Ext.Viewport({
		layout: 'border',
		items: [{
			region: 'north',
			height: 40,
			html: '<body><div style="position:relative;height:40px;line-height:40px;font-size:24px;color:#fff;background:#f8851f url(/ext-4.0.7-gpl/resources/themes/images/custom/icon.png) no-repeat 0 0;border-bottom:1px solid #c66a19;zoom:1;padding-left:48px;">Pinus监控中心</div></body>'
		},
		westpanel, centerPanel]
	});

});
/**
 * auto addPanel
 */

function addIframe(title, url, id) {
	tabPanel = centerPanel;

	if (tabPanel.getComponent(id) != null) {
		var arr = url.split('?');
		if (arr.length >= 2) {
			tabPanel.remove(tabPanel.getComponent(id));

			var iframe = Ext.DomHelper.append(document.body, {
				tag: 'iframe',
				frameBorder: 0,
				src: url,
				width: '100%',
				height: '100%'
			});

			var tab = new Ext.Panel({
				id: id,
				title: title,
				titleCollapse: true,
				iconCls: id,
				tabTip: title,
				closable: true,
				autoScroll: true,
				border: true,
				fitToFrame: true,
				contentEl: iframe
			});

			tabPanel.add(tab);
			tabPanel.setActiveTab(tab);
			return (tab);
		}
		tabPanel.setActiveTab(tabPanel.getComponent(id));
		return;
	}

	var iframe = Ext.DomHelper.append(document.body, {
		tag: 'iframe',
		frameBorder: 0,
		src: url,
		width: '100%',
		height: '100%'
	});

	var tab = new Ext.Panel({
		id: id,
		title: title,
		titleCollapse: true,
		iconCls: id,
		tabTip: title,
		closable: true,
		autoScroll: true,
		border: true,
		fitToFrame: true,
		contentEl: iframe
	});
	tabPanel.add(tab);
	tabPanel.setActiveTab(tab);
	return (tab);
};

Ext.onReady(function() {

	Ext.BLANK_IMAGE_URL = '../ext-4.0.7-gpl/resources/themes/images/default/tree/s.gif';

	//server comboBox
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
		valueField: 'name'
	});

	//script comboBox
	var scriptStore = Ext.create('Ext.data.Store', {
		fields: ['name', 'script']
	});

	var scriptCom = Ext.create('Ext.form.ComboBox', {
		id: 'scriptComId',
		fieldLabel: 'Script List',
		labelWidth: 80,
		store: scriptStore,
		queryMode: 'local',
		displayField: 'script',
		valueField: 'name',
		listeners: {
			select: {
				fn: function() {
					var value = scriptCom.getValue();
					get(value);
				}
			}
		}
	});

	var runScriptPanel = Ext.create('Ext.form.FormPanel', {
		bodyPadding: 10,
		autoScroll: true,
		autoShow: true,
		renderTo: Ext.getBody(),
		region: 'center',
		items: [{
			layout: 'column',
			border: false,
			anchor: '95%',
			items: [{
				xtype: 'label',
				text: 'Run Script:',
				columnWidth: .99
			},
			serverCom, scriptCom]
		}, {
			xtype: 'textareafield',
			height: 150,
			//region: 'center',
			id: 'scriptAreaId',
			anchor: '95%'
		}, {
			layout: 'column',
			anchor: '95%',
			border: false,
			items: [{
				// colspan: 2
				xtype: 'button',
				text: 'Run',
				handler: run,
				width: 150,
				margin: '10 0 10 900'
			}, {
				// colspan: 2
				xtype: 'button',
				text: 'Save',
				handler: saveForm,
				width: 150,
				margin: '10 0 10 100'
			}]
		}, {
			xtype: 'label',
			text: 'Result:'
			// height:20
		}, {
			xtype: 'textareafield',
			id: 'tesultTextId',
			height: 350,
			name: 'scriptId',
			anchor: '95%'
		}]
	});

	list();
	new Ext.Viewport({
		layout: 'border',
		items: [runScriptPanel]
	});
});

var saveForm = function() {
	var saveForm = Ext.create('Ext.form.Panel', {
		frame: true,
		bodyStyle: 'padding:2px 2px 0',
		width: 300,
		// defaultType: 'textfield',
		// renderTo: Ext.getBody(),
		anchor: '100%',
		fieldDefaults: {
			msgTarget: 'side',
			labelWidth: 50
		},
		items: [{
			xtype: 'textfield',
			id: 'scriptNameId',
			fieldLabel: 'name',
			name: 'scriptName',
			allowBlank: false,
			width: 250,
			value: Ext.getCmp('scriptComId').getValue()
		}],
		buttons: [{
			text: 'Save',
			handler: save
		}, {
			text: 'Cancel',
			handler: cancel
		}]
	});

	var win = Ext.create('Ext.window.Window', {
		id: 'saveWinId',
		title: 'saveScript',
		height: 100,
		width: 320,
		layout: 'fit',
		anchor: '100%',
		items: [saveForm]
	});

	win.show();
};

var cancel = function() {
	Ext.getCmp('saveWinId').close();
};

var list = function() {
	window.parent.client.request('scripts', {
		command: 'list'
	}, function(err, msg) {
		if (err) {
			alert(err);
			return;
		}
		var servers = [],
			scripts = [],
			i, l, item;
		for (i = 0, l = msg.servers.length; i < l; i++) {
			item = msg.servers[i];
			servers.push({
				name: item,
				serverId: item
			});
		}

		for (i = 0, l = msg.scripts.length; i < l; i++) {
			item = msg.scripts[i];
			scripts.push({
				name: item,
				script: item
			});
		}

		servers.sort(function(o1, o2) {
			return o1.name.localeCompare(o2);
		});

		scripts.sort(function(o1, o2) {
			return o1.name.localeCompare(o2);
		});

		Ext.getCmp('serverComId').getStore().loadData(servers);
		Ext.getCmp('scriptComId').getStore().loadData(scripts);
	});
};

//run the script
var run = function() {
	var scriptJs = Ext.getCmp('scriptAreaId').getValue();
	var serverId = Ext.getCmp('serverComId').getValue();

	if (!serverId) {
		alert('serverId is required!');
		return;
	}

	window.parent.client.request('scripts', {
		command: 'run',
		serverId: serverId,
		script: scriptJs
	}, function(err, msg) {
		if (err) {
			alert(err);
			return;
		}
		Ext.getCmp('tesultTextId').setValue(msg);
	});
};

var get = function(filename) {
	window.parent.client.request('scripts', {
		command: 'get',
		filename: filename
	}, function(err, msg) {
		if (err) {
			alert(err);
			return;
		}
		Ext.getCmp('scriptAreaId').setValue(msg);
	});
};

var save = function() {
	var filename = Ext.getCmp('scriptNameId').getValue();
	if (!filename.match(/\.js$/)) {
		alert('the filename is required!');
		return;
	}

	var data = Ext.getCmp('scriptAreaId').getValue();

	window.parent.client.request('scripts', {
		command: 'save',
		filename: filename,
		body: data
	}, function(err, msg) {
		if (err) {
			alert(err);
			return;
		}
		alert('save success!');
		data = Ext.getCmp('scriptAreaId').setValue('');
	});
};
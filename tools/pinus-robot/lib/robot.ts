var Agent = require('./agent/agent').Agent;
var Server = require('./master/server').Server;
var HTTP_SERVER = require('./console/http').HTTP_SERVER;
var util = require('./common/util').createPath();
/**
 * export to developer prototype
 * 
 * @param {Object} config
 * include deal with master and agent mode
 * 
 * param include mode
 *
 */
var Robot = function(conf){
  this.conf = conf;
  this.master = null;
  this.agent = null;
};


  /*
   * run master server
   *
   * @param {String} start up file
   *
   */ 
  Robot.prototype.runMaster = function(mainFile) {
    var conf = {},master;
    conf.clients = this.conf.clients;
    conf.mainFile = mainFile; 
    this.master = new Server(conf);
    this.master.listen(this.conf.master.port);
    HTTP_SERVER.start(this.conf.master.webport);
  };

  /**
   * run agent client 
   *
   * @param {String} script
   *
   */ 
  Robot.prototype.runAgent = function(scriptFile) {
    var conf = {};
    conf.master = this.conf.master;
    conf.apps = this.conf.apps;
    conf.scriptFile = scriptFile;
    this.agent = new Agent(conf);
    this.agent.start();
  };

  Robot.prototype.restart = function(){
    if (this.agent!= null){
      this.agent.reconnect(true);
    }
  }

  exports.Robot = Robot;


var Node = function(nodeId,iport,web_client) {
  this._dom;
  this.nodeId = nodeId;
  this.iport = iport;
  this.web_client = web_client;
  var node = this;
};

Node.prototype = {
  render: function() { throw "Node.render() not defined"; },
  destroy: function() { throw "Node.destroy() not defined"; }
};

//try {
//  module.exports = {
//    Node: Node
//  }
//} catch(err) {}

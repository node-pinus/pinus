/**
 * node abstract for agent node
 * 
 */
Node.prototype.render = function() {
  var n = this;
  this._dom = $("#node_template").clone()
  .find(".node").html('[' +n.iport+ ']').end()
    .attr("id", "node_" + n.nodeId)
    .data('label', n.nodeId);
  // alert(this._dom.html());
  // Add to control panel in alphabetical order
    $("#conndiv").append(n._dom);
};

Node.prototype.destroy = function() {
  this._dom.remove();
};

 

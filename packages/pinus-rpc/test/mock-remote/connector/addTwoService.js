/**
 * Mock remote service
 */
module.exports = function(app) {
  return {
    doService: function(value, cb) {
      cb(null, value + 2);
    },
    name: 'addTwoRemote'
  };
};
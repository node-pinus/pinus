/**
 * Mock remote service
 */
module.exports = {
	doService: function(value, cb) {
		cb(null, value + 3);
	}
};
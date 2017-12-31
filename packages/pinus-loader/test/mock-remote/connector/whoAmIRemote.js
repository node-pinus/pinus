**
 * Mock remote service
 */
module.exports = function(app) {
	return {
		doService: function(cb) {
			cb(null, app.id);
		}
	};
};
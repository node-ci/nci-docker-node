'use strict';

exports.register = function(app) {
	var Node = require('./node')(app);

	app.lib.node.register('docker', Node);
};

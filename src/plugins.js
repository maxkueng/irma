var path = require('path');
var fs = require('fs');

exports.load = function (y, config, messages, cron, logger, pluginsDir) {
	if (path.existsSync(pluginsDir)) {
		var files = fs.readdirSync(pluginsDir);
		for (var i in files) {
			require(pluginsDir + '/' + files[i]).init(y, config, messages, cron, logger);
			logger.info('plugin \'' + files[i] + '\' loaded');
		}
	}
};

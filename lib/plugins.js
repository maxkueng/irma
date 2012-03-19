var path = require('path');
var fs = require('fs');

exports.load = function (y, config, messages, cron, logger, pluginsDir) {
	if (path.existsSync(pluginsDir)) {
		if (Array.isArray(config.plugins)) {
			for (var i = 0; i < config.plugins.length; i++) {
				var filePath = path.join(pluginsDir, config.plugins[i]);

				if (path.existsSync(filePath + '.js')) {
					require(filePath).init(y, config, messages, cron, logger);
					logger.info('plugin \'' + config.plugins[i] + '\' initialized');
				}
			}

		} else {
			if (config.plugins === true) {
				var files = fs.readdirSync(pluginsDir);
				for (var i in files) {
					if (/\.js$/.exec(files[i])) {
						require(pluginsDir + '/' + files[i]).init(y, config, messages, cron, logger);
						logger.info('plugin \'' + files[i] + '\' initialized');
					}
				}
			}
		}
	}
};

"use strict";

var path = require('path');
var fs = require('fs');

exports.load = function (y, config, messages, cron, logger, pluginsDir) {
	var i, filePath, files;

	if (path.existsSync(pluginsDir)) {
		if (Array.isArray(config.plugins)) {
			for (i = 0; i < config.plugins.length; i++) {
				filePath = path.join(pluginsDir, config.plugins[i]);

				if (path.existsSync(filePath + '.js') || path.existsSync(path.join(filePath, 'index.js'))) {
					require(filePath).init(y, config, messages, cron, logger);
					logger.info('plugin \'' + config.plugins[i] + '\' initialized');
				}
			}

		} else {
			if (config.plugins === true) {
				files = fs.readdirSync(pluginsDir);
				for (i = 0; i < files.length; i++) {
					if (/\.js$/.exec(files[i])) {
						require(pluginsDir + '/' + files[i]).init(y, config, messages, cron, logger);
						logger.info('plugin \'' + files[i] + '\' initialized');
					}
				}
			}
		}
	}
};

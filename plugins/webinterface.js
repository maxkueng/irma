var util = require('util');

exports.init = function (y, config, messages, cron, logger) {
	var yammer_account = config.yammer;

	var getHTML = function () {
		var html = ''
			+ '<!DOCTYPE html>'
			+ '<html lang="en">'
			+ '<head>'
			+ '<meta charset="utf-8" />'
			+ '<title>PID ' + process.pid + ' ' + y.userAgent() + '</title>'
			+ '</head>'
			+ '<body>'
			+ '<p><strong>PID ' + process.pid + ' ' + y.userAgent() + '</strong></p>'
			+ '<p><strong>' + yammer_account.email + '</strong></p>'
			+ '<dl>'
			+ '</dl>'
			+ '<h2>Open Threads</h2>'
			+ '<dl>';

		var threads = y.openThreads();
		for (var i = 0; i < threads.length; i++) {
			var thread = threads[i];
			
			html += '<dt>' + thread.id() + '</dt>'
				+ '<dd><pre>' + util.inspect(thread, false, 3) + '</pre></dd>';
		}

		html += ''
			+ '</dl>'
			+ '<h2>Closed Threads</h2>'
			+ '<dl>';

		threads = y.closedThreads();
		for (var i = 0; i < threads.length; i++) {
			var thread = threads[i];
			
			html += '<dt>' + thread.id() + '</dt>'
				+ '<dd><pre>' + util.inspect(thread, false, 3) + '</pre></dd>';
		}

		html += ''
			+ '</dl>'
			+ '</body>'
			+ '</html>';

		return html;
	};

	var http = require('http');
	http.createServer(function (req, res) {
		res.writeHead(200, {'Content-Type': 'text/html'});
		res.end(getHTML());
	}).listen(config.webinterface.port, config.webinterface.ip);

};

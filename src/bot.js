require('datejs');
var util = require('util');
var fs = require('fs');
var path = require('path');
var cron = require('cron');
var logger = require('./logger');
var messages = require('./messages');
var plugins = require('./plugins');
var Yammer = require('./yammer').Yammer;

var cwd = process.cwd();
var config = load_config();
var yammer_account = config.yammer[config.yammer_account];

logger.setPrefix(function () {
	var d = new Date().toString("yyyy-MM-dd HH:mm:ss");		
	return '[' + d + '] ';
});

process.on('xuncaughtException', function (ex) {
	logger.error('uncaught exception: ' + ex);
});

var y = new Yammer(yammer_account.email, yammer_account.api.consumer_key, yammer_account.api.consumer_secret, function (authorizeURI, continueCallback) {
	util.puts(authorizeURI);
	util.puts('Please visit the link above, \nauthorize the request and enter the verifier code: ');

	process.stdin.resume();
	process.stdin.setEncoding('utf8');
	process.stdin.on('data', function(chunk) { 
		process.stdin.pause();
		continueCallback(chunk.toString());
	});
});

if (!messages.load(y.dataDir() + '/common/messages.json', y.profileDir())) {
	logger.error('failed to load messages');
	process.exit(1);
}

//plugins.load(y, config, messages, cron, logger, cwd + '/plugins');

y.on('error', function (error) {
	logger.error(JSON.stringify(error));
});

y.on('loggedon', function () {
	logger.info('logged on');

	y.loadUsers();
});

y.on('usersloaded', function () {
	logger.info('users loaded');
	y.pollMessages();
	y.pollPrivateMessages();
});

y.on('message', function (message) {
	console.log(message.id() + ': ' + message.plainBody());
});

y.logon();

//
function load_config () {
	if (path.existsSync(cwd + '/config.json')) {
		var config_data = fs.readFileSync(cwd + '/config.json', 'utf8');
		return JSON.parse(config_data);
	}

	util.puts('Error: Configuration file not found');
	process.exit(1);
}

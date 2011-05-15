Date.prototype.pad = function (n) {
	return (n < 10) ? '0' + n : n;
};

Date.prototype.toISODateTime = function () {
	return this.getFullYear() + '-'
		+ this.pad(this.getMonth() + 1) + '-'
		+ this.pad(this.getDate()) + 'T'
		+ this.pad(this.getHours()) + ':'
		+ this.pad(this.getMinutes()) + ':'
		+ this.pad(this.getSeconds());
};

var util = require('util');
var fs = require('fs');
var path = require('path');
var cron = require('cron');
var logger = require('../lib/logger');
var messages = require('../lib/messages');
var plugins = require('../lib/plugins');
var Yammer = require('../lib/yammer').Yammer;

var cwd = process.cwd();
var config = load_config();
var yammer_account = config.yammer[config.yammer_account];

logger.setPrefix(function () {
	var d = new Date().toISODateTime();		
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

messages.init(y.profileDir());
plugins.load(y, config, messages, cron, logger, cwd + '/plugins');

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

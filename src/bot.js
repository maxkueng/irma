var util = require('util');
var fs = require('fs');
var path = require('path');
var cron = require('cron');
var Yammer = require('./yammer').Yammer;

var cwd = process.cwd();
var config = load_config();
var yammer_account = config.yammer[config.yammer_account];

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

y.on('loggedon', function () {
	console.log('logged on');		
	y.loadUsers();
	y.pollMessages();
	
	new cron.CronJob('0 0 11 * * *', function () {
		console.log('yeah');	
	});
});

y.on('usersloaded', function () {
	console.log('users loaded');		
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

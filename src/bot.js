require('datejs');
var util = require('util');
var fs = require('fs');
var path = require('path');
var cron = require('cron');
var messages = require('./messages');
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
	util.log('logged on');		

	if (!messages.load(y.dataDir() + '/common/messages.json', y.profileDir())) {
		util.log('Failed to load messages');
		process.exit(1);
	}

	console.log(messages.get('veggie'));

	y.loadUsers();
});

y.on('usersloaded', function () {
	util.log('users loaded');		
	y.pollMessages();
	y.pollPrivateMessages();
	
	new cron.CronJob('0 27 17 * * *', function () {
		console.log('yeah');	

		y.sendMessage('Yeah baby woohoo, timed message', function (error, message) {
			util.log('sent message ' + message.id() + ': ' + message.parsedBody());
			var th = y.thread(message.threadId());
			th.setProperty('type', 'test');
			y.persistThread(th);
		});
	});

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

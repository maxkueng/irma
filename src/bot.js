require('datejs');
var util = require('util');
var fs = require('fs');
var path = require('path');
var cron = require('cron');
var logger = require('./logger');
var messages = require('./messages');
var Yammer = require('./yammer').Yammer;

var cwd = process.cwd();
var config = load_config();
var yammer_account = config.yammer[config.yammer_account];

logger.setPrefix(function () {
	var d = new Date().toString("yyyy-MM-dd HH:mm:ss");		
	return '[' + d + '] ';
});

process.on('uncaughtException', function (ex) {
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

y.on('loggedon', function () {
	logger.info('logged on');

	if (!messages.load(y.dataDir() + '/common/messages.json', y.profileDir())) {
		logger.error('failed to load messages');
		process.exit(1);
	}

	y.loadUsers();
});

y.on('usersloaded', function () {
	logger.info('users loaded');
	y.pollMessages();
	y.pollPrivateMessages();
	
//	Veggie Message
	new cron.CronJob('0 0 11 * * *', function () {
		if (Date.today().is().thursday()) {
			logger.info('sending veggie message');
			var message = messages.get('veggie');

			y.sendMessage(function (error, message) {
				logger.info('veggie message OK: ' + message.id());
				var thread = y.thread(message.threadId());
				thread.setProperty('type', 'veggie');
				thread.setProperty('status', 'closed');
				y.persistThread(thread);
			}, message);
		}
	});

//	Spaghetti Opening Message
	new cron.CronJob('0 15 9 * * *', function () {
		if (Date.today().is().thursday()) {
			logger.info('sending spaghetti opening message');
			var message = messages.get('spaghetti_opening');

			y.sendMessage(function (error, message) {
				logger.info('spaghetti opening message OK: ' + message.id());
				var thread = y.thread(message.threadId());
				thread.setProperty('type', 'spaghetti');
				thread.setProperty('status', 'open');
				thread.setProperty('joiners', []);
				y.persistThread(thread);
			}, message);
		}
	});

//	Spaghetti Closing Message
	new cron.CronJob('0 45 11 * * *', function () {
		if (Date.today().is().thursday()) {
			for (var threadId in y.threads()) {
				var thread = y.thread(threadId);

				if (thread.property('type') == 'spaghetti' && thread.property('status') == 'open') {
					var joiners = thread.property('joiners');
					var joinersList = '';

					for (var i in joiners) {
						var user = y.user(joiners[i]);
						if (i > 0) {
							joinersList += ', ';
						}

						joinersList += user.username();
					}

					var chef = y.user(yammer_account.chef_user_id);

					var closingMessage = messages.get('spaghetti_closing', {
						'count' : joiners.length, 
						'joiners' : joinersList, 
						'chef' : chef.username(), 
						'chef_name' : chef.fullName()
					});

					var chefMessage = messages.get('spaghetti_chef', {
						'count' : joiners.length, 
						'joiners' : joinersList, 
						'chef' : chef.username(), 
						'chef_name' : chef.fullName()
					});

					y.sendMessage(function (error, message) {
						logger.info('spaghetti chef message OK: ' + message.id());

						y.sendMessage(function (error, message) {
							logger.info('spaghetti closing message OK: ' + message.id());

							thread.setProperty('status', 'closed');
							y.persistThread(thread);
						}, closingMessage);
					}, chefMessage);
				}
			}
		}
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

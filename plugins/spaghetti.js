var util = require('util');

exports.init = function (y, config, messages, cron, logger) {
	messages.add('spaghetti_opening', "Spaghetti for lunch? Superzise? Like this message if you'd like to join.");
	messages.add('spaghetti_opening', "Spaghetti for lunch? Like this message if you'd like to join.");

	messages.add('spaghetti_closing', "Mamma mia ramba zamba! [count] hungry monkeys?? \nThe following are registered for lunch: [joiners]");
	messages.add('spaghetti_closing', "Ooooooohh! [count] hungry monkeys?? \nThe following are registered for lunch: [joiners]");

	messages.add('spaghetti_chef', "[chef_name], [count] mouths to feed! Hurry!!");

	messages.add('spaghetti_threadclosed', "Sorry, you're to late.");
	messages.add('spaghetti_threadclosed', "Too late!");
	messages.add('spaghetti_threadclosed', "Forget it!");

	var yammer_account = config.yammer[config.yammer_account];

	
	new cron.CronJob(config.spaghetti.cron_open, function () {
		var openingMessage = messages.get('spaghetti_opening');

		y.sendMessage(function (error, msg) {
			logger.info('spaghetti opening message OK: ' + msg.id());
			var thread = y.thread(msg.threadId());
			thread.setProperty('type', 'spaghetti');
			thread.setProperty('status', 'open');
			thread.setProperty('joiners', []);
			y.persistThread(thread);
		}, openingMessage);
	});

	new cron.CronJob(config.spaghetti.cron_close, function () {
		for (var threadId in y.threads()) {
			(function (thId) {
				var th = y.thread(thId);

				if (th.property('status') == 'open' && th.property('type') == 'spaghetti') {
					th.setProperty('status', 'closed');
					y.persistThread(th);

					y.updateThreadMessages(th, function (th) {
						var message = y.message(th.messageId());
						var joinersCount = message.likes();
						var joinerNames = message.likers();
						var joiners = [];
						
						for (var i = 0; i < joinerNames.length; i++) {
							joiners.push(y.userByName(joinerNames[i]));
						}

						var joinerIds = [];
						var joinersList = '';
						for (var i in joiners) {
							var user = joiners[i];
							joinerIds.push(user.id());

							if (i > 0) {
								joinersList += ', ';
							}

							joinersList += user.username();
						}

						var closingMessage = messages.get('spaghetti_closing', {
							'count' : joiners.length, 
							'joiners' : joinersList
						});

						y.sendMessage(function (error, message) {
							logger.info('spaghetti closing message OK: ' + message.id());

							th.setProperty('joiners', joinerIds);
							th.setProperty('status', 'closed');
							y.persistThread(th);
						}, closingMessage, { 'reply_to' : th.messageId() });

					});
				}
			
			})(threadId);
		}
	});
};

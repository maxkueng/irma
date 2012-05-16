var util = require('util');

exports.init = function (y, config, messages, cron, logger) {
	messages.add('spaghetti_opening', "Spaghetti for lunch? Superzise? Like this message if you'd like to join.");
	messages.add('spaghetti_opening', "Spaghetti for lunch? Like this message if you'd like to join.");

	messages.add('spaghetti_closing', "Mamma mia ramba zamba! [count] hungry monkeys?? \nThe following are registered for lunch: [joiners]");
	messages.add('spaghetti_closing', "Ooooooohh! [count] hungry monkeys?? \nThe following are registered for lunch: [joiners]");

	messages.add('spaghetti_notenough', "A minimum of 5 joiners is required to justify the effort of making spaghetti. There will be no spaghetti today. Sorry");
	messages.add('spaghetti_noone', "Noone?? Alright then... ;(");

	messages.add('spaghetti_chef', "[chef_name], [count] mouths to feed! Hurry!!");

	messages.add('spaghetti_threadclosed', "Sorry, you're to late.");

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
						var joinerIds = [];
						var joinersList = '';
						
						for (var i = 0; i < joinerNames.length; i++) {
							joiners.push(y.userByName(joinerNames[i]));
						}

						for (var i in joiners) {
							var user = joiners[i];
							joinerIds.push(user.id());

							if (i > 0) {
								joinersList += ', ';
							}

							joinersList += user.username();
						}

						if (joinerIds.length == 0) {
							var nooneMessage = messages.get('spaghetti_noone');
							y.sendMessage(function (error, message) {
								logger.info('spaghetti noone message OK: ' + message.id());

								th.setProperty('joiners', joinerIds);
								th.setProperty('status', 'closed');
								th.setProperty('charged', true);
								y.persistThread(th);
							}, nooneMessage, { 'reply_to' : th.messageId() });

						} else if (joinerIds.length < 5) {
							var notenoughMessage = messages.get('spaghetti_notenough');
							y.sendMessage(function (error, message) {
								logger.info('spaghetti notenough message OK: ' + message.id());

								th.setProperty('joiners', joinerIds);
								th.setProperty('status', 'closed');
								th.setProperty('charged', true);
								y.persistThread(th);
							}, notenoughMessage, { 'reply_to' : th.messageId() });

						} else {

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
						
						}

					});
				}
			
			})(threadId);
		}
	});
};

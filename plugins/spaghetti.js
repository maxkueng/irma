require('datejs');

exports.init = function (y, config, messages, cron, logger) {
	messages.add('spaghetti_opening', "Spaghetti today? If you'd like join today's spaghetti feast, please reply to this message by no later than 11:45.");
	messages.add('spaghetti_opening', "Spaghetti today? If you'd like join today's \"Spaghettiplausch\", please reply to this message by no later than 11:45.");
	messages.add('spaghetti_opening', "Who's down for some serious spaghetti madness? If you want to join please reply to this message by no later than 11:45.");
	messages.add('spaghetti_opening', "Countdown 10 to 0, Spaghetti for lunch? Cause I'm your hero. Vote for me and I'll set you free. WATCH OUT, WATCH OUT: Your Vote won't count after 11:45.");
	messages.add('spaghetti_opening', "Hungry? You can holla at me till 11:45. Spaghetti.");
	messages.add('spaghetti_opening', "Hungry? Well, maybe I don't feel like cooking today. Okay, anyway... I'll do it for the animals. You can answer me till 11:45 and I might consider your request.");
	messages.add('spaghetti_opening', "Barilla want's to know: To eat or not to eat Spaghetti, today for lunch, OK. You've got the choice. Answer me till 11:45.");
	messages.add('spaghetti_opening', "May I suggest our unbelievable blend of tasteful Pasta today? It's yummie yummie!");

	messages.add('spaghetti_closing', "Woohoo, [count] hungry monkeys!");
	messages.add('spaghetti_closing', "Cool cool cool, so we are [count]! I'll ask [chef] to start cooking.");
	messages.add('spaghetti_closing', "Run baby run... [count] want to mantsch. [chef], hurry hurry [count] are so hungry.");
	messages.add('spaghetti_closing', "[chef], on your marks get set GO! [count] Veggies want Spaghetti!");
	messages.add('spaghetti_closing', "[chef], you've got to move it move it. [count] want to see you sweat. Thank you\n[joiners].");

	messages.add('spaghetti_chef', "Hey [chef_name], [count] colleagues would love it if you cooked some spaghetti for them.\nNamely: [joiners]");
	messages.add('spaghetti_chef', "G'day [chef_name], [count] hungry mouths need to be stuffed.\n[joiners]");
	messages.add('spaghetti_chef', "Hello hello [chef_name], [count] hungry kittens to feed.\n[joiners]");

	var yammer_account = config.yammer[config.yammer_account];

	y.on('message', function (message) {
		logger.info('nothing');
	});

//	Spaghetti Opening Message
	new cron.CronJob('*/30 * * * * *', function () {
//		if (Date.today().is().thursday()) {
		if (true) {
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
	new cron.CronJob('* */2 * * * *', function () {
//		if (Date.today().is().thursday()) {
		if (true) {
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
						}, closingMessage, { 'reply_to' : thread.messageId() });
					}, chefMessage, { 'direct_to' : chef.id() });
				}
			}
		}
	});
};

"use strict";

var util = require('util');

exports.init = function (y, config, messages, cron, logger) {
	messages.add('spaghetti_opening', "Spaghetti for lunch? Superzise? Like this message if you'd like to join.");
	messages.add('spaghetti_opening', "Spaghetti for lunch? Like this message if you'd like to join.");
	messages.add('spaghetti_opening', "Barilla number 7, straight from heaven! Who's in? Hit \"like\" to join. It's spaghetti time!");
	messages.add('spaghetti_opening', "Who's a hungry monkey? Press the 'like' button to register for spaghetti.");

	messages.add('spaghetti_closing', "Mamma mia ramba zamba! [count] hungry monkeys?? \nThe following are registered for lunch: [joiners]");
	messages.add('spaghetti_closing', "Ooooohh! [count] hungry monkeys?? \nThe following are registered for lunch: [joiners]");
	messages.add('spaghetti_closing', "Wow, so many! [count] plates of worms for the birds. \n[joiners] are in for lunch.");

	messages.add('spaghetti_notenough', "Ooh, [count] is not enough. A minimum of 5 joiners is required to justify the effort of making spaghetti. There will be no spaghetti today. Sorry");
	messages.add('spaghetti_noone', "Noone?? Alright then... ;(");

	messages.add('spaghetti_stockerror', "Warning! There is not enough spaghetti for [count] people. Current stock will last for about [available_rations] rations.");

	messages.add('spaghetti_chef', "[chef_name], [count] mouths to feed! Hurry!!");

	messages.add('spaghetti_threadclosed', "Sorry, you're to late.");

	var openingCron, closingCron, closeThread;

	closeThread = function (thId) {
		var th, stocks, Stock, message;

		stocks = require('./kiosk/stocks');
		Stock = stocks.Stock;
		th = y.thread(thId);

		if (th.property('status') === 'open' && th.property('type') === 'spaghetti') {
			th.setProperty('status', 'closed');
			y.persistThread(th);

			message = y.message(th.messageId());
			y.messageLikers(message, function (likers) {
				var joinersList, joinerIds, user,
					nooneMessage, notenoughMessage, closingMessage,
					stockWarningMessage, stock, stockInfo,
					availableRations;

				joinersList = '';
				joinerIds = [];

				for (var i = 0; i < likers.length; i++) {
					user = likers[i];
					joinerIds.push(user.id());

					if (i > 0) { joinersList += ', '; }
					joinersList += user.username();
				}

				if (joinerIds.length === 0) {
					nooneMessage = messages.get('spaghetti_noone');
					y.sendMessage(function (error, message) {
						logger.info('spaghetti noone message OK: ' + message.id());

						th.setProperty('joiners', joinerIds);
						th.setProperty('status', 'closed');
						th.setProperty('charged', true);
						y.persistThread(th);
					}, nooneMessage, { 'reply_to' : th.messageId() });

				} else if (joinerIds.length < 5) {
					notenoughMessage = messages.get('spaghetti_notenough', {
						'count' : joinerIds.length
					});
					y.sendMessage(function (error, message) {
						logger.info('spaghetti notenough message OK: ' + message.id());

						th.setProperty('joiners', joinerIds);
						th.setProperty('status', 'closed');
						th.setProperty('charged', true);
						y.persistThread(th);
					}, notenoughMessage, { 'reply_to' : th.messageId() });

				} else {
					closingMessage = messages.get('spaghetti_closing', {
						'count' : joinerIds.length,
						'joiners' : joinersList
					});

					y.sendMessage(function (error, message) {
						logger.info('spaghetti closing message OK: ' + message.id());

						th.setProperty('joiners', joinerIds);
						th.setProperty('status', 'closed');
						y.persistThread(th);
					}, closingMessage, { 'reply_to' : th.messageId() });


					stock = stocks.get('03032ac58f81');
					stockInfo = stock.info();
					availableRations = Math.round((stockInfo.stock / 150) * 10) / 10;

					if (availableRations < joinerIds.length) {
						stockWarningMessage = messages.get('spaghetti_stockerror', {
							'count' : joinerIds.length,
							'available_rations' : availableRations
						});

						y.sendMessage(function (error, message) {
							logger.info('spaghetti stockerror message OK: ' + message.id());

						}, stockWarningMessage, { 'reply_to' : th.messageId() });
					}

				}

			});
		}

	};

	openingCron = new cron.CronJob(config.spaghetti.cron_open, function () {
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

	closingCron = new cron.CronJob(config.spaghetti.cron_close, function () {
		var threads = y.threads();

		for (var threadId in threads) {
			if (threads.hasOwnProperty(threadId)) {
				closeThread(threadId);
			}
		}
	});
};

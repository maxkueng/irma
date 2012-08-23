"use strict";

require('datejs');
var util = require('util');

exports.init = function (y, config, messages, cron, logger) {
	var accounts = require('./kiosk/accounts'),
		Account = accounts.Account,
		bookings = require('./kiosk/bookings'),
		Booking = bookings.Booking,
		items = require('./kiosk/items'),
		Item = items.Item,
		kioskLogger = require('./kiosk/logger'),
		stocks = require('./kiosk/stocks'),
		Stock = stocks.Stock,
		chargerCron,
		handleUnchargedThread,
		book;

	messages.add('spaghetti_autocharge_notify', "Hey [name], I have automatically charged your digital kiosk account with CHF [price] for spaghetti.");

	book = function (userId, th) {
		var item, account, booking;

		item = items.get('03032ac58f81');
		account = accounts.get(userId);

		booking = new Booking({
			'id' : bookings.uuid(),
			'itemId' : item.id(),
			'time' : Date.now(),
			'amount' : item.price() * -1,
			'name' : item.name(),
			'description' : item.description(),
			'type' : 'purchase',
			'automatic' : true
		});

		account.book(booking, function (err, bookingId) {
			var text, stock;

			th.setProperty('charged', true);
			y.persistThread(th);

			text = messages.get('spaghetti_autocharge_notify', {
				'name' : y.user(userId).fullName(),
				'price' : item.displayPrice()
			});

			y.sendMessage(function (error, msg) {
				var thread;
				thread = y.thread(msg.threadId());
				thread.setProperty('type', 'spaghetti_autocharge_notify');
				thread.setProperty('status', 'closed');
				y.persistThread(thread);

			}, text, { 'direct_to' : userId });

			if (item.isStockable()) {
				stock = stocks.get(item.id());
				stock.update({
					'bookingId' : bookingId,
					'type' : 'consumption',
					'change' : item.ration() * -1
				});
			}

			kioskLogger.log(null, account, account.booking(bookingId));
		});
	};

	handleUnchargedThread = function (thId) {
		var th, d;

		th = y.thread(thId);
		if (th.createdAt() && th.property('status') === 'closed' && th.property('charged') !== true && th.property('type') === 'spaghetti') {
			d = new Date(th.createdAt());

			if (Date.today().compareTo(d.addHours(12)) === -1) {
				y.updateThreadMessages(th, function (thread) {
					var message, d, joiners;

					message = y.message(thread.messageId());
					d = new Date(message.createdAt());
					joiners = th.property('joiners');

					for (var i = 0; i < joiners.length; i++) {
						book(joiners[i], th);
					}
				});
			}
		}
	};

	chargerCron = new cron.CronJob(config.spaghetti_autocharge.cron_charge, function () {
		var threads;

		threads = y.threads();
		for (var threadId in threads) {
			if (threads.hasOwnProperty(threadId)) {
				handleUnchargedThread(threadId);
			}
		}
	});

};

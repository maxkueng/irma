require('datejs');
var util = require('util');

exports.init = function (y, config, messages, cron, logger) {
	var accounts = require('./kiosk/accounts');
	var Account = accounts.Account;
	var bookings = require('./kiosk/bookings');
	var Booking = bookings.Booking;
	var items = require('./kiosk/items');
	var Item = items.Item;
	var kioskLogger = require('./kiosk/logger');
	var stocks = require('./kiosk/stocks');
	var Stock = stocks.Stock;

	messages.add('spaghetti_autocharge_notify', "Hey [name], I have automatically charged your digital kiosk account with CHF [price] for spaghetti.");

	new cron.CronJob(config.spaghetti_autocharge.cron_charge, function () {
		for (var threadId in y.threads()) {
			(function (thId) {
				var th = y.thread(thId);
				if (th.createdAt() && th.property('status') == 'closed' && th.property('charged') !== true && th.property('type') == 'spaghetti') {
					var d = new Date(th.createdAt());

					if (Date.today().compareTo(d.addHours(12)) == -1) {
						y.updateThreadMessages(th, function (thread) {
							var message = y.message(thread.messageId());
							var d = new Date(message.createdAt());

							var joiners = th.property('joiners');

							for (var i = 0; i < joiners.length; i++) {
								(function (_i) {
									var userId = joiners[_i];

									var item = items.get('03032ac58f81');
									var account = accounts.get(userId);

									var booking = new Booking({
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
										th.setProperty('charged', true);
										y.persistThread(th);

										var text = messages.get('spaghetti_autocharge_notify', {
											'name' : y.user(userId).fullName(), 
											'price' : item.displayPrice()
										});

										y.sendMessage(function (error, msg) {
											var thread = y.thread(msg.threadId());
											thread.setProperty('type', 'spaghetti_autocharge_notify');
											thread.setProperty('status', 'closed');
											y.persistThread(thread);

										}, text, { 'direct_to' : userId });

										if (item.isStockable()) {
											var stock = stocks.get(item.id());
											stock.update({
												'bookingId' : bookingId, 
												'type' : 'consumption', 
												'change' : item.ration() * -1
											});
										}

										kioskLogger.log(null, account, account.booking(bookingId));
									});

								})(i);
							}
						});
					}
				}
			
			})(threadId);
		}
	});

};

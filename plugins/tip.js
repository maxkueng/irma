"use strict";

exports.init = function (y, config, messages, cron, logger) {
	messages.add('tip_error', "Huh? Sorry I don't understand that.");
	messages.add('tip_verify', "[✔] Verified: [from] ➜ CHF [amount] ➜ [to]");
	messages.add('tip_notify', "[from] has tipped you CHF [amount].");

	var formatMoney = function (n) {
		var c = 2, d = '.', t = "'", s, i, j;

		c = isNaN(c = Math.abs(c)) ? 2 : c;
		d = d === undefined ? "," : d;
		t = t === undefined ? "." : t;
		s = n < 0 ? "-" : "";
		i = String(parseInt(n = Math.abs(+n || 0).toFixed(c), 10));
		j = (j = i.length) > 3 ? j % 3 : 0;

		return s + (j ? i.substr(0, j) + t : "") + i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + t) + (c ? d + Math.abs(n - i).toFixed(c).slice(2) : "");
	};

	var handleTip = function (message) {
		if (/\+tip\b/i.test(message.plainBody())) {
			var command, amount, userId, verify,
				amountRegex = /\s(\d+(\.\d+)?)/,
				userIdRegex = /\[\[user\:([0-9]+)\]\]/,
				accounts = require('./kiosk/accounts'),
				Account = accounts.Account,
				bookings = require('./kiosk/bookings'),
				Booking = bookings.Booking,
				items = require('./kiosk/items'),
				Item = items.Item,
				kioskLogger = require('./kiosk/logger'),
				stocks = require('./kiosk/stocks'),
				Stock = stocks.Stock;


			command = /\+tip\b.+$/i.exec(message.parsedBody())[0];
			command = command.replace(/\-\.([0-9]+)/, '0.$1');
			command = command.replace(/([0-9]+)\.[\-]+?/, '$1.0');

			var itms = items.all(),
				itmId;
			for (itmId in itms) {
				if (itms.hasOwnProperty(itmId)) {
					command = command.replace(itms[itmId].name(), itms[itmId].price() / 100);
				}
			}

			if (amountRegex.test(command)) { amount = Number(amountRegex.exec(command)[1]) * 100; }
			if (userIdRegex.test(command)) { userId = parseInt(userIdRegex.exec(command)[1]); }
			verify = (command.indexOf('verify') !== -1);

			if (amount && userId) {
				var fromAccount = accounts.get(message.senderId());
				var toAccount = accounts.get(userId);

				var fromBooking = new Booking({
					'id' : bookings.uuid(),
					'time' : Date.now(),
					'amount' : amount * -1,
					'name' : 'Tip to ' + y.user(userId).fullName(),
					'description' : 'You have tipped ' + y.user(userId).fullName() + ' with CHF ' + formatMoney(amount * -1 / 100),
					'type' : 'tip',
					'automatic' : false
				});

				var toBooking = new Booking({
					'id' : bookings.uuid(),
					'time' : Date.now(),
					'amount' : amount,
					'name' : 'Tip from ' + y.user(message.senderId()).fullName(),
					'description' : y.user(message.senderId()).fullName() + ' has tipped you with CHF ' + formatMoney(amount / 100),
					'type' : 'tip',
					'automatic' : false
				});

				fromAccount.book(fromBooking, function (err, fromBookingId) {
					kioskLogger.log(null, fromAccount, fromAccount.booking(fromBookingId));

					toAccount.book(toBooking, function (err, toBookingId) {
						kioskLogger.log(null, toAccount, toAccount.booking(toBookingId));

						if (verify) {
							var verifyMessage = messages.get('tip_verify', {
								'from' : y.user(message.senderId()).username(),
								'to' : y.user(userId).username(),
								'amount' : formatMoney(amount / 100)
							});

							y.sendMessage(function (err, msg) {
							}, verifyMessage, { 'reply_to' : message.id() });
						}

						var notifyMessage = messages.get('tip_notify', {
							'from' : y.user(message.senderId()).username(),
							'amount' : formatMoney(amount / 100)
						});

						y.sendMessage(function (err, msg) {
						}, notifyMessage, { 'direct_to' : userId });
					});
				});

			} else if (verify) {
				var errorMessage = messages.get('tip_error');

				y.sendMessage(function (err, msg) {
				}, errorMessage, { 'reply_to' : message.id() });
			}
		}
	};

	y.on('message', handleTip); // private
	y.on('publicMessage', handleTip);
};

"use strict";

exports.init = function (y, config, messages, cron, logger) {

	var natural = require('natural'),
		moment = require('moment'),
		nodemailer = require('nodemailer'),
		_ = require('underscore'),
		fs = require('fs'),
		path = require('path'),
		messageRegex = /\b(cola|coke|cola zero|coke zero|colazero|cokezero|coca cola|cocacola)\b/i,
		dataDir = path.join(y.profileDir(), 'colazero'),
		orderHistoryPath = path.join(dataDir, 'history.json'),
		orderHistory = [],
		yesnoClassifier = new natural.BayesClassifier(),
		commandClassifier = new natural.BayesClassifier(),
		mailTransport = nodemailer.createTransport('SMTP', {
			'host' : config.colazero.mail_host,
			'port' : config.colazero.mail_port,
			'auth' : {
				'user' : config.colazero.mail_user,
				'pass' : config.colazero.mail_pass
			}
		});

	messages.add('colazero_not_understood', "Sorry, I didn't get it. Please rephase.");
	messages.add('colazero_email_error', "Oh motherf&*#*@☠☆!! I failed to send the email. Must be some misconfiguration or a problem with the mail server.");
	messages.add('colazero_ask', "I have already ordered new beverages [diff], as instructed by [user]. \nAre you sure you want me to order coke again?");
	messages.add('colazero_ask', "Whaaaat?? The last order wasn't even [diff]. \nDo I really have to order again?");
	messages.add('colazero_buy_complete', "Woop woop! I have just ordered a whole bunch of coke for us all.");
	messages.add('colazero_buy_complete', "Affirmative, new coke is on the way. Thanks!");
	messages.add('colazero_abort', "Okay, I'm not ordering anything.");
	messages.add('colazero_abort', "Uhh, thank you! I'm so fed up ordering coke all the time.");
	messages.add('colazero_list', "Here's a list of the last 10 coke orders:\n\n[list]");

	yesnoClassifier.addDocument('Yes', 'yes');
	yesnoClassifier.addDocument('Sure', 'yes');
	yesnoClassifier.addDocument('Absolutely', 'yes');
	yesnoClassifier.addDocument('Sounds great', 'yes');
	yesnoClassifier.addDocument('Sounds good', 'yes');
	yesnoClassifier.addDocument('Definitely', 'yes');
	yesnoClassifier.addDocument('Certainly', 'yes');
	yesnoClassifier.addDocument('Good idea', 'yes');
	yesnoClassifier.addDocument('Please', 'yes');
	yesnoClassifier.addDocument('Yes please', 'yes');
	yesnoClassifier.addDocument('Please do', 'yes');
	yesnoClassifier.addDocument('Do it', 'yes');
	yesnoClassifier.addDocument('Go for it', 'yes');
	yesnoClassifier.addDocument('You have green', 'yes');
	yesnoClassifier.addDocument('Why not', 'yes');
	yesnoClassifier.addDocument('Yay', 'yes');
	yesnoClassifier.addDocument('Yeah', 'yes');
	yesnoClassifier.addDocument('Affirmative', 'yes');
	yesnoClassifier.addDocument('All right', 'yes');
	yesnoClassifier.addDocument('Amen', 'yes');
	yesnoClassifier.addDocument('Aye', 'yes');
	yesnoClassifier.addDocument('Beyond a doubt', 'yes');
	yesnoClassifier.addDocument('By all means', 'yes');
	yesnoClassifier.addDocument('Even so', 'yes');
	yesnoClassifier.addDocument('Exactly', 'yes');
	yesnoClassifier.addDocument('Fine', 'yes');
	yesnoClassifier.addDocument('Gladly', 'yes');
	yesnoClassifier.addDocument('Good', 'yes');
	yesnoClassifier.addDocument('Good enough', 'yes');
	yesnoClassifier.addDocument('Granted', 'yes');
	yesnoClassifier.addDocument('Indubitably', 'yes');
	yesnoClassifier.addDocument('Just so', 'yes');
	yesnoClassifier.addDocument('Most assuredly', 'yes');
	yesnoClassifier.addDocument('Naturally', 'yes');
	yesnoClassifier.addDocument('Of course', 'yes');
	yesnoClassifier.addDocument('Okay', 'yes');
	yesnoClassifier.addDocument('Ok', 'yes');
	yesnoClassifier.addDocument('Positive', 'yes');
	yesnoClassifier.addDocument('Positively', 'yes');
	yesnoClassifier.addDocument('Precisely', 'yes');
	yesnoClassifier.addDocument('Sure thing', 'yes');
	yesnoClassifier.addDocument('Surely', 'yes');
	yesnoClassifier.addDocument('True', 'yes');
	yesnoClassifier.addDocument('Undoubtedly', 'yes');
	yesnoClassifier.addDocument('Unquestionably', 'yes');
	yesnoClassifier.addDocument('Very well', 'yes');
	yesnoClassifier.addDocument('Willingly', 'yes');
	yesnoClassifier.addDocument('Without fail', 'yes');
	yesnoClassifier.addDocument('Yea', 'yes');
	yesnoClassifier.addDocument('Yep', 'yes');

	yesnoClassifier.addDocument('No', 'no');
	yesnoClassifier.addDocument('Don\'t', 'no');
	yesnoClassifier.addDocument('Forget about it', 'no');
	yesnoClassifier.addDocument('Wouldn\'t make sense', 'no');
	yesnoClassifier.addDocument('Never mind', 'no');
	yesnoClassifier.addDocument('Nevermind', 'no');
	yesnoClassifier.addDocument('Absolutely not', 'no');
	yesnoClassifier.addDocument('Sounds bad', 'no');
	yesnoClassifier.addDocument('Doesn\'t sound like a good idea', 'no');
	yesnoClassifier.addDocument('Bad idea', 'no');
	yesnoClassifier.addDocument('Very bad idea', 'no');
	yesnoClassifier.addDocument('Certainly not', 'no');
	yesnoClassifier.addDocument('Please don\'t', 'no');
	yesnoClassifier.addDocument('Don\'t do it', 'no');
	yesnoClassifier.addDocument('No thanks', 'no');
	yesnoClassifier.addDocument('No no no', 'no');
	yesnoClassifier.addDocument('NoNoNo', 'no');
	yesnoClassifier.addDocument('Not now', 'no');
	yesnoClassifier.addDocument('Nope', 'no');
	yesnoClassifier.addDocument('Not this time', 'no');
	yesnoClassifier.addDocument('Heck no', 'no');
	yesnoClassifier.addDocument('I\'ll come back later', 'no');
	yesnoClassifier.addDocument('Maybe later', 'no');
	yesnoClassifier.addDocument('Another time', 'no');
	yesnoClassifier.addDocument('Not possible', 'no');
	yesnoClassifier.addDocument('Impossible', 'no');
	yesnoClassifier.addDocument('Nah', 'no');
	yesnoClassifier.addDocument('Nay', 'no');
	yesnoClassifier.addDocument('Unfortunately it\'s not a good time', 'no');
	yesnoClassifier.addDocument('No I\'d rather you didn’t but thanks anyway', 'no');
	yesnoClassifier.addDocument('Abort', 'no');
	yesnoClassifier.addDocument('N to the O', 'no');
	yesnoClassifier.addDocument('Absolutely not', 'no');
	yesnoClassifier.addDocument('By no means', 'no');
	yesnoClassifier.addDocument('Negative', 'no');
	yesnoClassifier.addDocument('Never', 'no');
	yesnoClassifier.addDocument('Nix', 'no');
	yesnoClassifier.addDocument('No way', 'no');
	yesnoClassifier.addDocument('Not at all', 'no');
	yesnoClassifier.addDocument('Not by any means', 'no');

	yesnoClassifier.train();

	commandClassifier.addDocument('Buy coke', 'buy');
	commandClassifier.addDocument('Buy cola', 'buy');
	commandClassifier.addDocument('Buy coca cola', 'buy');
	commandClassifier.addDocument('Buy coke zero', 'buy');
	commandClassifier.addDocument('Buy cola zero', 'buy');
	commandClassifier.addDocument('Buy cokezero', 'buy');
	commandClassifier.addDocument('Buy colazero', 'buy');
	commandClassifier.addDocument('Coke is empty', 'buy');
	commandClassifier.addDocument('Cola is empty', 'buy');
	commandClassifier.addDocument('Coca cola is empty', 'buy');
	commandClassifier.addDocument('Coke zero is empty', 'buy');
	commandClassifier.addDocument('Cola zero is empty', 'buy');
	commandClassifier.addDocument('Cokezero is empty', 'buy');
	commandClassifier.addDocument('Colazero is empty', 'buy');
	commandClassifier.addDocument('There is no more coke', 'buy');
	commandClassifier.addDocument('There is no more cola', 'buy');
	commandClassifier.addDocument('There is no more coca cola', 'buy');
	commandClassifier.addDocument('There is no more coke zero', 'buy');
	commandClassifier.addDocument('There is no more cola zero', 'buy');
	commandClassifier.addDocument('There is no more cokezero', 'buy');
	commandClassifier.addDocument('There is no more colazero', 'buy');
	commandClassifier.addDocument('All coke is gone', 'buy');
	commandClassifier.addDocument('All cola is gone', 'buy');
	commandClassifier.addDocument('All coca cola is gone', 'buy');
	commandClassifier.addDocument('All coke zero is gone', 'buy');
	commandClassifier.addDocument('All cola zero is gone', 'buy');
	commandClassifier.addDocument('All cokezero is gone', 'buy');
	commandClassifier.addDocument('All colazero is gone', 'buy');
	commandClassifier.addDocument('We\'ve used up all coke', 'buy');
	commandClassifier.addDocument('We\'ve used up all cola', 'buy');
	commandClassifier.addDocument('We\'ve used up all coca cola', 'buy');
	commandClassifier.addDocument('We\'ve used up all coke zero', 'buy');
	commandClassifier.addDocument('We\'ve used up all cola zero', 'buy');
	commandClassifier.addDocument('We\'ve used up all cokezero', 'buy');
	commandClassifier.addDocument('We\'ve used up all colazero', 'buy');
	commandClassifier.addDocument('Coke stock is bad', 'buy');
	commandClassifier.addDocument('Cola stock is bad', 'buy');
	commandClassifier.addDocument('Coca cola stock is bad', 'buy');
	commandClassifier.addDocument('Coke zero stock is bad', 'buy');
	commandClassifier.addDocument('Cola zero stock is bad', 'buy');
	commandClassifier.addDocument('Cokezero stock is bad', 'buy');
	commandClassifier.addDocument('Colazero stock is bad', 'buy');
	commandClassifier.addDocument('Coke stock is low', 'buy');
	commandClassifier.addDocument('Cola stock is low', 'buy');
	commandClassifier.addDocument('Coca cola stock is low', 'buy');
	commandClassifier.addDocument('Coke zero stock is low', 'buy');
	commandClassifier.addDocument('Cola zero stock is low', 'buy');
	commandClassifier.addDocument('Cokezero stock is low', 'buy');
	commandClassifier.addDocument('Colazero stock is low', 'buy');
	commandClassifier.addDocument('Coke problem', 'buy');
	commandClassifier.addDocument('Cola problem', 'buy');
	commandClassifier.addDocument('Coca cola problem', 'buy');
	commandClassifier.addDocument('Coke zero problem', 'buy');
	commandClassifier.addDocument('Cola zero problem', 'buy');
	commandClassifier.addDocument('Cokezero problem', 'buy');
	commandClassifier.addDocument('Colazero problem', 'buy');

	commandClassifier.addDocument('Coke list', 'list');
	commandClassifier.addDocument('Cola list', 'list');
	commandClassifier.addDocument('Coca cola list', 'list');
	commandClassifier.addDocument('Coke zero list', 'list');
	commandClassifier.addDocument('Cola zero list', 'list');
	commandClassifier.addDocument('Cokezero list', 'list');
	commandClassifier.addDocument('Colazero list', 'list');
	commandClassifier.addDocument('Coke history', 'list');
	commandClassifier.addDocument('Cola history', 'list');
	commandClassifier.addDocument('Coca cola history', 'list');
	commandClassifier.addDocument('Coke zero history', 'list');
	commandClassifier.addDocument('Cola zero history', 'list');
	commandClassifier.addDocument('Cokezero history', 'list');
	commandClassifier.addDocument('Colazero history', 'list');
	commandClassifier.addDocument('Show me a list of recent Coke orders', 'list');
	commandClassifier.addDocument('Show me a list of recent Cola orders', 'list');
	commandClassifier.addDocument('Show me a list of recent coca cola orders', 'list');
	commandClassifier.addDocument('Show me a list of recent coke zero orders', 'list');
	commandClassifier.addDocument('Show me a list of recent cola zero orders', 'list');
	commandClassifier.addDocument('Show me a list of recent cokezero orders', 'list');
	commandClassifier.addDocument('Show me a list of recent colazero orders', 'list');
	commandClassifier.addDocument('Show me a list of recent Coke purchases', 'list');
	commandClassifier.addDocument('Show me a list of recent Cola purchases', 'list');
	commandClassifier.addDocument('Show me a list of recent coca cola purchases', 'list');
	commandClassifier.addDocument('Show me a list of recent coke zero purchases', 'list');
	commandClassifier.addDocument('Show me a list of recent cola zero purchases', 'list');
	commandClassifier.addDocument('Show me a list of recent cokezero purchases', 'list');
	commandClassifier.addDocument('Show me a list of recent colazero purchases', 'list');
	commandClassifier.addDocument('When did you last order Coke', 'list');
	commandClassifier.addDocument('When did you last order Cola', 'list');
	commandClassifier.addDocument('When did you last order Coca cola', 'list');
	commandClassifier.addDocument('When did you last order Coke zero', 'list');
	commandClassifier.addDocument('When did you last order Cola zero', 'list');
	commandClassifier.addDocument('When did you last order Cokezero', 'list');
	commandClassifier.addDocument('When did you last order Colazero', 'list');
	commandClassifier.addDocument('Have you already ordered Coke', 'list');
	commandClassifier.addDocument('Have you already ordered Cola', 'list');
	commandClassifier.addDocument('Have you already ordered Coca cola', 'list');
	commandClassifier.addDocument('Have you already ordered Coke zero', 'list');
	commandClassifier.addDocument('Have you already ordered Cola zero', 'list');
	commandClassifier.addDocument('Have you already ordered Cokezero', 'list');
	commandClassifier.addDocument('Have you already ordered Colazero', 'list');
	commandClassifier.addDocument('Have you already bought Coke', 'list');
	commandClassifier.addDocument('Have you already bought Cola', 'list');
	commandClassifier.addDocument('Have you already bought Coca cola', 'list');
	commandClassifier.addDocument('Have you already bought Coke zero', 'list');
	commandClassifier.addDocument('Have you already bought Cola zero', 'list');
	commandClassifier.addDocument('Have you already bought Cokezero', 'list');
	commandClassifier.addDocument('Have you already bought Colazero', 'list');

	commandClassifier.train();

	var setupDataDir = function (callback) {
		fs.exists(dataDir, function (exists) {
			if (exists) {
				if (typeof callback === 'function') { callback(); }

			} else {
				fs.mkdir(dataDir, function (err) {
					if (typeof callback === 'function') { callback(err); }
				});
			}
		});
	};

	var loadOrderHistory = function (callback) {
		setupDataDir(function (err) {
			if (err && typeof callback === 'function') { callback(err); return; }
			fs.exists(orderHistoryPath, function (exists) {
				if (exists) {
					fs.readFile(orderHistoryPath, 'utf8', function (err, data) {
						if (err && typeof callback === 'function') { callback(err); return; }

						try {
							orderHistory = JSON.parse(data);
							if (typeof callback === 'function') { callback(); }
							return;
						} catch (e) {
							orderHistory = [];
							if (typeof callback === 'function') { callback(e); }
							return;
						}
					});

				} else {
					orderHistory = [];
					if (typeof callback === 'function') { callback(); }
					return;
				}
			});
		});
	};

	var persistOrderHistory = function (callback) {
		setupDataDir(function (err) {
			if (err && typeof callback === 'function') { callback(err); return; }

			fs.writeFile(orderHistoryPath, JSON.stringify(orderHistory, null, '\t'), function (err) {
				if (typeof callback === 'function') { callback(err); return; }
			});
		});
	};

	loadOrderHistory();

	var handleNotUnderstoodMessage = function (message, callback) {
		var thread = y.thread(message.threadId());
		var text = messages.get('colazero_not_understood');
		y.sendMessage(function (err, sentMessage) {

			if (typeof callback === 'function') { callback(null, sentMessage); }

		}, text, { 'reply_to' : thread.id() });
	};

	var replyAsk = function (message, lastOrder, callback) {
		var lastOrderTime = moment.unix(lastOrder.timestamp),
			duration = lastOrderTime.diff(moment(), 'seconds'),
			user = y.user(lastOrder.userId),
			thread = y.thread(message.threadId()),
			text = messages.get('colazero_ask', {
				'diff' : moment.duration(duration, 'seconds').humanize(true),
				'user' : user.username()
			});

		y.sendMessage(function (err, sentMessage) {
			thread.setProperty('status', 'ask');
			y.persistThread(thread);

			if (typeof callback === 'function') { callback(null, sentMessage); }

		}, text, { 'reply_to' : thread.id() });
	};

	var replyError = function (message, callback) {
		var thread = y.thread(message.threadId());
		var text = messages.get('colazero_email_error');
		y.sendMessage(function (err, sentMessage) {
			thread.setProperty('status', 'closed');
			y.persistThread(thread);

			if (typeof callback === 'function') { callback(null, sentMessage); }

		}, text, { 'reply_to' : thread.id() });
	};

	var replyBuyComplete = function (message, callback) {
		var thread = y.thread(message.threadId());
		var text = messages.get('colazero_buy_complete');
		y.sendMessage(function (err, sentMessage) {
			thread.setProperty('status', 'closed');
			y.persistThread(thread);

			if (typeof callback === 'function') { callback(null, sentMessage); }

		}, text, { 'reply_to' : thread.id() });
	};

	var buy = function (message, callback) {
		console.log('buy');
		var now = moment(),
			order = {
				'timestamp' : now.unix(),
				'userId' : message.senderId()
			},
			mailOptions = {
				'from' : config.colazero.mail_from,
				'to' : config.colazero.mail_to,
				'subject' : config.colazero.mail_subject,
				'text' : config.colazero.mail_text
			};

		mailTransport.sendMail(mailOptions, function (err) {
			if (err) { return replyError(message); }

			orderHistory.push(order);
			persistOrderHistory();

			replyBuyComplete(message);
		});

		console.log(order);

	};

	var abort = function (message, callback) {
		var thread = y.thread(message.threadId());
		var text = messages.get('colazero_abort');
		y.sendMessage(function (err, sentMessage) {
			thread.setProperty('status', 'closed');
			y.persistThread(thread);

			if (typeof callback === 'function') { callback(null, sentMessage); }

		}, text, { 'reply_to' : thread.id() });
	};

	var handleBuyMessage = function (message, callback) {
		var lastOrder,
			lastOrderTime,
			thread = y.thread(message.threadId()),
			now = moment(),
			rebuyTreshold = config.colazero.rebuy_treshold || 604800;

		if (orderHistory.length > 0) {
			lastOrder = orderHistory[orderHistory.length - 1];
			lastOrderTime = moment.unix(lastOrder.timestamp);

			if (lastOrderTime.diff(now, 'seconds') < rebuyTreshold) {
				return replyAsk(message, lastOrder);
			}
		}

		buy(message);
	};

	var handleListMessage = function (message, callback) {
		var list = '', items,
			index = orderHistory.length - 10 - 1;

		if (index < 0) { index = 0; }
		items = _.rest(orderHistory, index);

		items.forEach(function (item) {
			var u = y.user(item.userId);
			list += moment.unix(item.timestamp).format() + ' (' + u.username() + ')\n';
		});

		var thread = y.thread(message.threadId());
		var text = messages.get('colazero_list', { 'list' : list });
		y.sendMessage(function (err, sentMessage) {
			thread.setProperty('status', 'closed');
			y.persistThread(thread);

			if (typeof callback === 'function') { callback(null, sentMessage); }

		}, text, { 'reply_to' : thread.id() });
	};

	var handleCokeMessage = function (message) {
		var thread = y.thread(message.threadId());
		if (!thread || thread.property('status') === 'closed') { return; }
		var status = thread.property('status') || null;

		if (!status || status === 'open') {
			var cmd = commandClassifier.classify(message.plainBody());

			console.log('cmd', cmd);
			if (!cmd) { return handleNotUnderstoodMessage(message); }
			if (cmd === 'buy') { return handleBuyMessage(message); }
			if (cmd === 'list') { return handleListMessage(message); }
		}

		if (status === 'ask') {
			var yesno = yesnoClassifier.classify(message.plainBody());

			if (!yesno) { return handleNotUnderstoodMessage(message); }
			if (yesno === 'yes') { return buy(message); }
			if (yesno === 'no') { return abort(message); }
		}
	};

	y.on('message', function (message) {
		var thread = y.thread(message.threadId());

		if (messageRegex.test(message.plainBody()) || thread.property('type') === 'colazero') {
			thread.setProperty('type', 'colazero');
			y.persistThread(thread);
			handleCokeMessage(message);
		}
	});

};

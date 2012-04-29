exports.init = function (y, config, messages, cron, logger) {
	messages.add('kiosk_monthly_archive', "Hey [name], I have archived all your Kiosk bookings for [month]. This is the automatic monthly archive. \nYour current account balance is CHF [balance]");
	messages.add('kiosk_initialize', "Hey [name], I have initialized your digital kiosk account. Your current account balance is CHF [balance]");
	messages.add('kiosk_tally', "Hey [name], your tally marks have been carried over to your digital kiosk account. \nYour new account balance is CHF [balance]");
	messages.add('kiosk_deposit', "Hey [name], you have successfully deposited CHF [deposit] to your digital kiosk account. \nYour new account balance is CHF [balance]");
	messages.add('kiosk_withdraw', "Hey [name], you have successfully withdrawn CHF [withdrawal] from your digital kiosk account. \nYour new account balance is CHF [balance]");

	var path = require('path');
	var fs = require('fs');
	var express = require('express');
	var ejs = require('ejs');
	require('datejs');

	var formatMoney = function (n) {
		var c = 2, d = '.', t = "'";
		c = isNaN(c = Math.abs(c)) ? 2 : c, d = d == undefined ? "," : d, t = t == undefined ? "." : t, s = n < 0 ? "-" : "", i = parseInt(n = Math.abs(+n || 0).toFixed(c)) + "", j = (j = i.length) > 3 ? j % 3 : 0;
		return s + (j ? i.substr(0, j) + t : "") + i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + t) + (c ? d + Math.abs(n - i).toFixed(c).slice(2) : "");
	};

	ejs.filters.isodate = function(time) {
		return new Date(time).toString("yyyy-MM-dd HH:mm:ss");
	};

	ejs.filters.isodate_short = function(time) {
		return new Date(time).toString("MM-dd HH:mm");
	};

	ejs.filters.money = function (n) {
		return formatMoney(n);
	};

	var pluginDir = __dirname;
	var publicDir = path.join(pluginDir, 'public');
	var viewsDir = path.join(pluginDir, 'views');
	var dataDir = path.join(pluginDir, 'data');

	if (!path.existsSync(pluginDir)) fs.mkdirSync(pluginDir, '0777');
	if (!path.existsSync(publicDir)) fs.mkdirSync(publicDir, '0777');
	if (!path.existsSync(viewsDir)) fs.mkdirSync(viewsDir, '0777');
	if (!path.existsSync(dataDir)) fs.mkdirSync(dataDir, '0777');

	var items = require('./items');
	var Item = items.Item;
	var accounts = require('./accounts');
	accounts.dataDir = dataDir;
	var Account = accounts.Account;
	var bookings = require('./bookings');
	var Booking = bookings.Booking;
	var stocks = require('./stocks');
	stocks.dataDir = dataDir;
	var Stock = stocks.Stock;
	var kioskLogger = require('./logger');
	kioskLogger.dataDir = dataDir;
	y.on('usersloaded', function () {
		kioskLogger.init(y.users());
	});

	items.add(new Item({
		'id' : '03032ac58f81', 
		'name' : 'Spaghetti', 
		'description' : 'Spaghetti for one person', 
		'price' : 300, 
		'displayPrice' : '3.-', 
		'buyable' : true, 
		'stockable' : true, 
		'unit' : 'Grams', 
		'ration' : 150
	}));

	items.add(new Item({
		'id' : '72080d0c8bcb', 
		'name' : 'Kiosk 1', 
		'description' : 'Small item', 
		'price' : 50, 
		'displayPrice' : '-.50', 
		'buyable' : true
	}));

	items.add(new Item({
		'id' : 'dbbe85aec38e', 
		'name' : 'Kiosk 2', 
		'description' : 'Big item', 
		'price' : 100, 
		'displayPrice' : '1.-', 
		'buyable' : true
	}));

	var app = express.createServer(
//		express.logger(), 
		express.static(publicDir), 
		express.bodyParser(), 
		express.cookieParser()
	);

	app.configure(function () {
		app.set('views', viewsDir);
	});

	app.listen(config.kiosk.port, function () {
		console.log('Kiosk running on port ' + config.kiosk.port);		
	});

	new cron.CronJob('0 0 8 28 * *', function () {
//	new cron.CronJob('0 12 1 * * *', function () {
		archiveAll();
	});

	var authCheck = function (req, res, callback) {
		if (typeof req.cookies === 'undefined')  req.cookies = {};
		var b64URL = new Buffer(req.url).toString('base64');
		var userId = req.cookies['irmakioskid'];
		if (!userId || !y.user(userId)) { res.redirect('/login/' + b64URL); return; }

		req.userId = userId;
		callback();
	};

	app.get('/', function (req, res) {
		authCheck(req, res, function () {
			var userId = req.userId;

			res.render('index.ejs', {
				'layout' : 'layout.ejs', 
				'req' : req, 
				'res' : res, 
				'items' : items.all()
			});
		});

	});

	app.get('/about', function (req, res) {
		res.render('about.ejs', {
			'layout' : 'layout.ejs', 
			'req' : req, 
			'res' : res, 
		});

	});

	app.get('/login/:b64url?', function (req, res) {
		var users = [];
		for (var id in y.users()) {
			users.push(y.user(id));
		}

		res.render('login.ejs', {
			'layout' : 'layout.ejs', 
			'req' : req, 
			'res' : res, 
			'users' : users, 
			'redirecturl' : req.params['b64url'] || '/'
		});
	});

	app.get('/auth/:id/:b64url?', function (req, res) {
		var userId = req.params['id'];
		if (user = y.user(userId)) {
			res.cookie('irmakioskid', user.id(), { 'path' : '/', 'expires' : new Date(Date.now() + (360*24*3600*1000)), 'httpOnly' : true });
		}

		var b64url = req.params['b64url'];
		var url = '/';
		if (b64url) url = new Buffer(b64url, 'base64').toString('utf8');

		res.redirect(url);
	});

	app.get('/logout', function (req, res) {
		res.clearCookie('irmakioskid', { 'path' : '/' });
		res.redirect('/');
	});

	app.get('/pay/:itemId', function (req, res) {
		authCheck(req, res, function () {
			var userId = req.userId;
			var account = accounts.get(userId);
			
			puchaseItem(userId, req.params['itemId'], function (err, bookingId) {
				if (err) { res.redirect('/error'); return; }

				res.redirect('/paid/' + bookingId);
				kioskLogger.log(userId, account, account.booking(bookingId));
			});
		});
	});

	app.get('/reverse/:bookingId', function (req, res) {
		authCheck(req, res, function () {
			var userId = req.userId;
			var account = accounts.get(userId);
			var oldBooking = account.booking(req.params['bookingId']);
			
			account.reverse(oldBooking.id(), function (err, bookingId) {
				if (err) { res.redirect('/error'); return; }
				var booking = account.booking(bookingId);

				if (oldBooking.itemId()) {
					var item = items.get(oldBooking.itemId());

					if (item.isStockable()) {
						var stock = stocks.get(item.id());
						var stockUpdate = stock.updateByBookingId(req.params['bookingId'])

						stock.update({
							'bookingId' : booking.id(), 
							'type' : 'reverse', 
							'change' : stockUpdate.change * -1
						});
					}
				}

				res.redirect('/account');
				kioskLogger.log(userId, account, account.booking(bookingId));
			});
		});
	});

	app.get('/admin', function (req, res) {
		authCheck(req, res, function () {
			var userId = req.userId;
			res.redirect('/deposit');
		});
	});

	app.get('/deposit', function (req, res) {
		authCheck(req, res, function () {
			var userId = req.userId;

			res.render('deposit.ejs', {
				'layout' : 'layout.ejs', 
				'req' : req, 
				'res' : res, 
				'users' : y.users()
			});
		});

	});

	app.post('/deposit', function (req, res) {
		authCheck(req, res, function () {
			var userId = req.userId;
			var user = parseInt(req.body['user']);
			var amount = parseInt(req.body['amount'] * 100);
			var account = accounts.get(user);

			account.deposit(amount, function (err, bookingId) {
				res.render('depositok.ejs', {
					'layout' : 'layout.ejs', 
					'req' : req, 
					'res' : res, 
					'balance' : account.balance()
				});

				kioskLogger.log(userId, account, account.booking(bookingId));

				var text = messages.get('kiosk_deposit', {
					'name' : y.user(user).fullName(), 
					'deposit' : formatMoney(amount / 100), 
					'balance' : formatMoney(account.balance() / 100)
				});

				y.sendMessage(function (error, msg) {
					var thread = y.thread(msg.threadId());
					thread.setProperty('type', 'kiosk_deposit');
					thread.setProperty('status', 'closed');
					y.persistThread(thread);

				}, text, { 'direct_to' : user });
			});
		});
	});

	app.get('/withdraw', function (req, res) {
		authCheck(req, res, function () {
			var userId = req.userId;

			res.render('withdraw.ejs', {
				'layout' : 'layout.ejs', 
				'req' : req, 
				'res' : res, 
				'users' : y.users()
			});
		});

	});

	app.post('/withdraw', function (req, res) {
		authCheck(req, res, function () {
			var userId = req.userId;
			var user = parseInt(req.body['user']);
			var amount = parseInt(req.body['amount'] * 100);
			var account = accounts.get(user);

			account.withdraw(amount, function (err, bookingId) {
				res.render('withdrawok.ejs', {
					'layout' : 'layout.ejs', 
					'req' : req, 
					'res' : res, 
					'balance' : account.balance()
				});

				kioskLogger.log(userId, account, account.booking(bookingId));

				var text = messages.get('kiosk_withdraw', {
					'name' : y.user(user).fullName(), 
					'withdrawal' : formatMoney(amount / 100), 
					'balance' : formatMoney(account.balance() / 100)
				});

				y.sendMessage(function (error, msg) {
					var thread = y.thread(msg.threadId());
					thread.setProperty('type', 'kiosk_withdrawal');
					thread.setProperty('status', 'closed');
					y.persistThread(thread);

				}, text, { 'direct_to' : user });
			});
		});
	});

	app.get('/stock', function (req, res) {
		authCheck(req, res, function () {
			var userId = req.userId;

			var allItems = items.all();
			var stockableItems = [];
			for (var itemId in allItems) {
				var item = items.get(itemId);
				if (item.isStockable()) stockableItems.push(item);
			}

			res.render('stock.ejs', {
				'layout' : 'layout.ejs', 
				'req' : req, 
				'res' : res, 
				'stockableItems' : stockableItems
			});
		});

	});

	app.post('/stock', function (req, res) {
		authCheck(req, res, function () {
			var userId = req.userId;
			var amount = parseInt(req.body['amount'] * 100);
			var description = req.body['description'];
			var itemId = req.body['item'];
			var stockChange = parseInt(req.body['stock']);
			var restockmode = req.body['restockmode'];
			var account = accounts.get(userId);
			var item = null;
			if (restockmode == 'item') item = items.get(itemId);

			var bookingName = 'Stock';
			if (item && item.isStockable()) bookingName += ': ' + item.name();
			if (!item && description) bookingName += ': ' + description;

			var booking = new Booking({
				'id' : bookings.uuid(), 
				'itemId' : null, 
				'time' : Date.now(), 
				'amount' : amount, 
				'name' : bookingName, 
				'description' : (item && item.isStockable()) ? item.name() + ': ' + stockChange + ' ' + item.unit() : description, 
				'type' : 'stock'
			});

			account.book(booking, function (err, bookingId) {
				res.redirect('/account');

				if (restockmode == 'item') {
					if (item && item.isStockable()) {
						var stock = stocks.get(item.id());
						stock.update({
							'bookingId' : bookingId, 
							'type' : 'restock', 
							'change' : stockChange
						});
					}
				}

				kioskLogger.log(userId, account, account.booking(bookingId));
			});

		});
	});

	app.get('/tally', function (req, res) {
		authCheck(req, res, function () {
			var userId = req.userId;

			res.render('tally.ejs', {
				'layout' : 'layout.ejs', 
				'req' : req, 
				'res' : res, 
				'users' : y.users(), 
				'items' : [
					items.get('03032ac58f81'), 
					items.get('72080d0c8bcb')
				]
			});
		});

	});

	app.post('/tally', function (req, res) {
		authCheck(req, res, function () {
			var userId = req.userId;
			var user = parseInt(req.body['user']);
			var amount = parseInt(req.body['amount'] * 100);
			var account = accounts.get(user);

			var itemIds = req.body['item'];
			var marks = req.body['marks'];

			var wait = itemIds.length -1;

			for (var i = 0; i < itemIds.length; i++) {
				(function (_i) {
					var item = items.get(itemIds[_i]);
					var mark = parseInt(marks[_i]);

					if (mark) {
						var rec = {
							'item' : item, 
							'marks' : mark, 
							'total' : mark * item.price()
						};

						tallyCarryOver(user, rec, function (err, bookingId) {
							kioskLogger.log(userId, account, account.booking(bookingId));

							if (item.isStockable()) {
								var stock = stocks.get(item.id());
								stock.update({
									'bookingId' : bookingId, 
									'type' : 'consumption', 
									'change' : item.ration() * rec.marks * -1
								});
							}

							if (! --wait) {
								res.render('tallyok.ejs', {
									'layout' : 'layout.ejs', 
									'req' : req, 
									'res' : res, 
									'balance' : account.balance()
								});

								var text = messages.get('kiosk_tally', {
									'name' : y.user(userId).fullName(), 
									'balance' : formatMoney(account.balance() / 100)
								});

								y.sendMessage(function (error, msg) {
									var thread = y.thread(msg.threadId());
									thread.setProperty('type', 'kiosk_tally_carry_over');
									thread.setProperty('status', 'closed');
									y.persistThread(thread);

								}, text, { 'direct_to' : userId });
							}
						});
					}
				})(i);
			}
		});
	});

	app.get('/initialize', function (req, res) {
		authCheck(req, res, function () {
			var userId = req.userId;

			res.render('initialize.ejs', {
				'layout' : 'layout.ejs', 
				'req' : req, 
				'res' : res, 
				'users' : y.users()
			});
		});

	});

	app.post('/initialize', function (req, res) {
		authCheck(req, res, function () {
			var userId = req.userId;
			var user = parseInt(req.body['user']);
			var amount = parseInt(req.body['amount'] * 100);
			var account = accounts.get(user);

			account.initialize(amount, function (err, bookingId) {
				res.render('initializeok.ejs', {
					'layout' : 'layout.ejs', 
					'req' : req, 
					'res' : res, 
					'balance' : account.balance()
				});

				kioskLogger.log(userId, account, account.booking(bookingId));

				var text = messages.get('kiosk_initialize', {
					'name' : y.user(user).fullName(), 
					'balance' : formatMoney(account.balance() / 100)
				});

				y.sendMessage(function (error, msg) {
					var thread = y.thread(msg.threadId());
					thread.setProperty('type', 'kiosk_initialization');
					thread.setProperty('status', 'closed');
					y.persistThread(thread);

				}, text, { 'direct_to' : user });
			});
		});
	});


	app.get('/paid/:id', function (req, res) {
		authCheck(req, res, function () {
			var userId = req.userId;

			var account = accounts.get(userId);
			var booking = account.booking(req.params['id']);
			var item = items.get(booking.itemId());

			res.render('paid.ejs', {
				'layout' : 'layout.ejs', 
				'req' : req, 
				'res' : res, 
				'account' : accounts.get(userId), 
				'booking' : booking, 
				'item' : item
			});
		});

	});

	app.get('/account/:user?', function (req, res) {
		authCheck(req, res, function () {
			var userId = req.userId;
			if (req.params['user']) userId = parseInt(req.params['user']);

			res.render('account.ejs', {
				'layout' : 'layout.ejs', 
				'req' : req, 
				'res' : res, 
				'account' : accounts.get(userId)
			});
		});
	});

	app.get('/xaccount', function (req, res) {
		if (typeof req.cookies === 'undefined')  req.cookies = {};
		var b64URL = new Buffer(req.url).toString('base64');
		var userId = req.cookies['irmakioskid'];
		if (!userId) { res.redirect('/login/' + b64URL); return; }

		res.render('account.ejs', {
			'layout' : 'layout.ejs', 
			'req' : req, 
			'res' : res, 
			'account' : accounts.get(userId)
		});

	});

	app.get('/booking/:id', function (req, res) {
		authCheck(req, res, function () {
			var userId = req.userId;

			var account = accounts.get(userId);
			var booking = account.booking(req.params['id']);
			var item = items.get(booking.itemId());

			res.render('booking.ejs', {
				'layout' : 'layout.ejs', 
				'req' : req, 
				'res' : res, 
				'account' : account, 
				'booking' : booking, 
				'item' : item
			});
		});

	});

	app.get('/item/:id', function (req, res) {
		authCheck(req, res, function () {
			var userId = req.userId;

			var item = items.get(req.params['id']);

			res.render('item.ejs', {
				'layout' : 'layout.ejs', 
				'req' : req, 
				'res' : res, 
				'item' : item
			});
		});

	});

	app.get('/overview', function (req, res) {
		authCheck(req, res, function () {
			var userId = req.userId;

			var accs = {};
			var users = y.users();
			for (var user in users) {
				accs[user] = accounts.get(user);
			}

			res.render('overview.ejs', {
				'layout' : 'layout.ejs', 
				'req' : req, 
				'res' : res, 
				'accounts' : accs, 
				'users' : users
			});
		});
	});

	app.get('/log', function (req, res) {
		authCheck(req, res, function () {
			var userId = req.userId;

			res.render('log.ejs', {
				'layout' : 'layout.ejs', 
				'req' : req, 
				'res' : res, 
				'log' : kioskLogger.entries(), 
				'users' : y.users()
			});
		});
	});

	app.get('/stocklist', function (req, res) {
		authCheck(req, res, function () {
			var userId = req.userId;

			var itemList = items.all();
			var info = [];
			for (var itemId in itemList) {
				if (itemList[itemId].isStockable()) {
					var stock = stocks.get(itemId);
					info.push({
						'info' : stock.info(), 
						'item' : itemList[itemId]
					});
				}
			}

			res.render('stocklist.ejs', {
				'layout' : 'layout.ejs', 
				'req' : req, 
				'res' : res, 
				'stockInfo' : info
			});
		});
	});

	var archiveAll = function () {
		var users = y.users();
		for (var i in users) {
			(function (_i) {

				var account = accounts.get(users[_i].id());
				if (account.bookings().length > 1) {
					account.archive(function (err, bookingId) {
						var now = new Date();
						var text = messages.get('kiosk_monthly_archive', {
							'name' : users[_i].fullName(), 
							'month' : now.toString('MMMM yyyy'), 
							'balance' : formatMoney(account.balance() / 100)
						});

						kioskLogger.log(account, account.booking(bookingId));

						y.sendMessage(function (error, msg) {
							logger.info('kiosk monthly archive for ' + users[_i].username());
							var thread = y.thread(msg.threadId());
							thread.setProperty('type', 'kiosk_monthly_archive');
							thread.setProperty('status', 'closed');
							y.persistThread(thread);

						}, text, { 'direct_to' : users[_i].id() });
					});
				}

			})(i);
		}
	};

	var tallyCarryOver = function (userId, rec, callback) {
		var account = accounts.get(userId);

		var booking = new Booking({
			'id' : bookings.uuid(), 
			'itemId' : null, 
			'time' : Date.now(), 
			'amount' : rec.total * -1, 
			'name' : rec.marks + ' x ' + rec.item.name(), 
			'description' : 'Tally list carry over', 
			'type' : 'tally carry over', 
			'admin' : true
		});

		account.book(booking, function () {
			callback(false, booking.id());
		});
	};

	var puchaseItem = function (userId, itemId, callback) {
		var account = accounts.get(userId);
		var item = items.get(itemId);

		if (!account || !item) { callback(true); return; }

		var booking = new Booking({
			'id' : bookings.uuid(), 
			'itemId' : itemId, 
			'time' : Date.now(), 
			'amount' : item.price() * -1, 
			'name' : item.name(), 
			'description' : item.description(), 
			'type' : 'purchase'
		});

		account.book(booking, function () {
			callback(false, booking.id());		

			if (item.isStockable()) {
				var stock = stocks.get(item.id());
				stock.update({
					'bookingId' : booking.id(), 
					'type' : 'consumption', 
					'change' : item.ration() * -1
				});
			}
		});
	};

	var allBookings = function () {
		var b = [];
		var users = y.users();
		for (var userId in users) {
			var account = accounts.get(userId);
			b = b.concat(account.bookings());
		}

		return b;
	};

};

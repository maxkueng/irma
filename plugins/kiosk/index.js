exports.init = function (y, config, messages, cron, logger) {
	var path = require('path');
	var fs = require('fs');
	var express = require('express');

	var pluginDir = __dirname;
	var publicDir = path.join(pluginDir, 'public');
	var viewsDir = path.join(pluginDir, 'views');
	var dataDir = path.join(pluginDir, 'data');

	if (!path.existsSync(pluginDir)) fs.mkdirSync(pluginDir, '0777');
	if (!path.existsSync(publicDir)) fs.mkdirSync(publicDir, '0777');
	if (!path.existsSync(viewsDir)) fs.mkdirSync(viewsDir, '0777');
	if (!path.existsSync(dataDir)) fs.mkdirSync(dataDir, '0777');

	var userAccounts = {};

	var items = {
		'03032ac58f81' : {
			'name' : 'Spaghetti', 
			'description' : 'Spaghetti for one person', 
			'value' : 300, 
			'displayValue' : '3.-', 
			'buyable' : true
		}, 
		'72080d0c8bcb' : {
			'name' : 'Kiosk 1', 
			'description' : 'Small item', 
			'value' : 50, 
			'displayValue' : '-.50', 
			'buyable' : true
		}, 
		'dbbe85aec38e' : {
			'name' : 'Kiosk 2', 
			'description' : 'Big item', 
			'value' : 100, 
			'displayValue' : '1.-', 
			'buyable' : true
		}, 
		'102f5037fe64' : {
			'name' : 'Funding', 
			'description' : 'Funding', 
			'value' : -100, 
			'displayValue' : '0.-', 
			'buyable' : false
		}, 
		'c15906790e4a' : {
			'name' : 'Init', 
			'description' : 'Account initial balance', 
			'value' : 0, 
			'displayValue' : '0.-', 
			'buyable' : false
		}
	};


	var app = express.createServer(
		express.logger(), 
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

	app.get('/', function (req, res) {
		if (typeof req.cookies === 'undefined')  req.cookies = {};
		var userId = req.cookies['irmakioskid'];
		if (!userId) { res.redirect('/login'); return; }

		res.render('index.ejs', {
			'layout' : 'layout.ejs', 
			'req' : req, 
			'res' : res, 
			'items' : items
		});

	});

	app.get('/about', function (req, res) {
		res.render('about.ejs', {
			'layout' : 'layout2.ejs', 
			'req' : req, 
			'res' : res, 
		});

	});

	app.get('/login', function (req, res) {
		var users = [];
		for (var id in y.users()) {
			users.push(y.user(id));
		}

		res.render('login.ejs', {
			'layout' : 'layout.ejs', 
			'req' : req, 
			'res' : res, 
			'users' : users
		});
	});

	app.get('/login/:id', function (req, res) {
		var userId = req.params['id'];
		if (user = y.user(userId)) {
			res.cookie('irmakioskid', user.id(), { 'path' : '/', 'expires' : new Date(Date.now() + (360*24*3600*1000)), 'httpOnly' : true });
		}

		res.redirect('/');
	});

	app.get('/logout', function (req, res) {
		res.clearCookie('irmakioskid', { 'path' : '/' });
		res.redirect('/');
	});

	app.get('/pay/:id', function (req, res) {
		if (typeof req.cookies === 'undefined')  req.cookies = {};
		var userId = req.cookies['irmakioskid'];
		if (!userId) { res.redirect('/login'); return; }
		
		payItem(userId, req.params['id'], function (err) {
			if (err) { res.redirect('/error'); return; }

			res.redirect('/paid/' + req.params['id']);
		});
	});

	app.get('/fund/:amount', function (req, res) {
		if (typeof req.cookies === 'undefined')  req.cookies = {};
		var userId = req.cookies['irmakioskid'];
		if (!userId) { res.redirect('/login'); return; }

		var amount = parseInt(req.params['amount']);
		
		fundAccount(userId, amount, function (err) {
			if (err) { res.redirect('/error'); return; }

			res.redirect('/account');
		});
	});

	app.get('/paid/:id', function (req, res) {
		if (typeof req.cookies === 'undefined')  req.cookies = {};
		var userId = req.cookies['irmakioskid'];
		if (!userId) { res.redirect('/login'); return; }

		res.render('paid.ejs', {
			'layout' : 'layout.ejs', 
			'req' : req, 
			'res' : res, 
			'balance' : accountBalance(userId), 
			'item' : items[req.params['id']]
		});

	});

	app.get('/account', function (req, res) {
		if (typeof req.cookies === 'undefined')  req.cookies = {};
		var userId = req.cookies['irmakioskid'];
		if (!userId) { res.redirect('/login'); return; }

		res.render('account.ejs', {
			'layout' : 'layout.ejs', 
			'req' : req, 
			'res' : res, 
			'balance' : accountBalance(userId), 
			'account' : userAccounts[userId], 
			'items' : items
		});

	});


	var userAccount = function (userId) {
		if (typeof userAccounts[userId] !== 'undefined') return userAccounts[userId];

		var accountFile = path.join(dataDir, userId + '.json');

		if (path.existsSync(accountFile)) {

			var data = fs.readFileSync(accountFile, 'UTF-8');
			var accountData = JSON.parse(data);
			userAccounts[userId] = accountData;
			return userAccounts[userId];

		} else {
			userAccounts[userId] = [];
			return userAccounts[userId];
		}

	};

	var persistAccount = function (userId, callback) {
		var accountFile = path.join(dataDir, userId + '.json');
		var data = JSON.stringify(userAccount(userId));

		fs.writeFile(accountFile, data, function (err) {
			if (err) throw err;
			callback();
		});
	};

	var payItem = function (userId, itemId, callback) {
		var account = userAccount(userId);
		var item = items[itemId];

		if (!account || !item) { callback(true); return; }

		var accountEntry = {
			'item' : itemId, 
			'time' : Date.now(), 
			'amount' : item.value * -1
		};

		userAccounts[userId].push(accountEntry);
		persistAccount(userId, function () {
			callback(false);		
		});
	};

	var fundAccount = function (userId, amount, callback) {
		var account = userAccount(userId);

		if (!account) { callback(true); return; }

		var accountEntry = {
			'item' : '102f5037fe64', 
			'time' : Date.now(), 
			'amount' : amount
		};

		userAccounts[userId].push(accountEntry);
		persistAccount(userId, function () {
			callback(false);		
		});

	};

	var accountBalance = function (userId) {
		var account = userAccount(userId);
		var balance = 0;

		for (var i = account.length -1; i >= 0; --i) {
			balance += parseInt(account[i].amount);
		}

		return balance;
	};

};

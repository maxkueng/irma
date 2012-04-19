exports.init = function (y, config, messages, cron, logger) {
	var path = require('path');
	var fs = require('fs');
	var express = require('express');

	var pluginDir = __dirname;
	var publicDir = path.join(pluginDir, 'public');
	var viewsDir = path.join(pluginDir, 'views');

	if (!path.existsSync(pluginDir)) fs.mkdirSync(pluginDir, '0777');
	if (!path.existsSync(publicDir)) fs.mkdirSync(publicDir, '0777');
	if (!path.existsSync(viewsDir)) fs.mkdirSync(viewsDir, '0777');


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
		console.log(req.cookies);
		var users = [];
		for (var id in y.users()) {
			users.push(y.user(id));
		}

		res.render('index.ejs', {
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

};

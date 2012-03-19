require('datejs');
var request = require('request');
var jsdom = require('jsdom');
var qs = require('querystring');

exports.init = function (y, config, messages, cron, logger) {

	var cwRequest = function (uri, callback) {
		var cookieJar = request.jar()
		var cookie = request.cookie('x=' + config.chorewars.username);
		cookie.name = 'name'; // Bug workaround. Cooike name cannot be 'name'
		cookieJar.add(cookie);
		cookieJar.add(request.cookie('password=' + config.chorewars.password));

		request({ 
			'uri' : uri, 
			'jar': cookieJar

		}, function (error, response, body) {
			if (error && response.statusCode !== 200) {
				console.log('Error')
			}

			jsdom.env( {
				'html' : body,
				'scripts' : [
					'http://code.jquery.com/jquery-1.5.min.js'
				]
			}, callback);

		});
	};

	var top3 = function (callback) {
		cwRequest('http://www.chorewars.com/party.php', function (err, window) {
			var $ = window.jQuery;
			var list = [];

			var charStats = $('.charstat');

			for (var i = 0; i < 3; i++) {
				var user = {};

				var charStat = $(charStats[i]);
				var charLink = charStat.find('.charinfotop a');
				var username = /name=(.*)$/.exec(charLink.attr('href'))[1];
				var displayName = charLink.text();

				var xpRow = charStat.find('tr').last();
				var xpCol = xpRow.find('td').last();
				var xp = xpCol.find('b').text();

				var user = {
					'username' : username, 
					'displayName' : displayName, 
					'xp' : xp
				};

				list.push(user);
			}

			callback(list);
		});
	};




	new cron.CronJob(config.chorewars.cron_top3, function () {
		logger.info('announcing top 3 chorewars adventurers');

		top3(function (list) {
			console.log(list);
		});
	});
};


"use strict";

var request = require('request');

exports.init = function (y, config, messages, cron, logger) {

	messages.add('s18_ok', "The next S18 to Stadelofen leaves in [m] minutes.");
	messages.add('s18_tight', "You better run, you've got [m] minutes!!");
	messages.add('s18_tight', "[m] minutes. Hurry, hurry, hurry!!");
	messages.add('s18_wontmake', "Forget it, the train leaves in [m] minutes. I'd say we wait for the next one in [m2] minutes ([t2]).");
	messages.add('s18_wontmake', "You'll never make it. That's in [m] minutes. There's another train in [m2] minutes ([t2]). Much better looking and less smelly.");
	messages.add('s18_wontmake_nonext', "[m] minutes. There is no other train.");
	messages.add('s18_zero', "The train is at the station right now. Doors are closing any second. The next train leaves in [m2] minutes.");
	messages.add('s18_nonext', "There is currently no train. Sorry...");
	messages.add('s18_error', "Sorry, I don't do train lookups in my coffee break.");

	y.on('message', function (message) {
		var thread, s18Url, trains;

		thread = y.thread(message.threadId());

		if (/\b(s18|train|forchbahn|bahn|zug)\b/i.test(message.plainBody()) || thread.property('type') === 's18') {
			thread.setProperty('type', 's18');

			s18Url = 'http://online.fahrplan.zvv.ch/bin/stboard.exe/dn?L=vs_widgets&input=008503067&boardType=dep&time=now&productsFilter=01001111110&additionalTime=0&disableEquivs=false&maxJourney+s=20&start=yes&selectDate=today&monitor=1&requestType=0&timeFormat=cd&view=preview';
			trains = [];

			request(
				{
					'uri' : s18Url
				},
				function (error, response, body) {
					var messageKey, data, journey, first, second,
						messageParams, messageText;

					if (!error && response.statusCode === 200) {
						body = body.replace('journeysObj = ', '');
						data = JSON.parse(body);
						if (data.journey) {
							for (var i = 0; i < data.journey.length; i++) {
								journey = data.journey[i];
								if (journey.pr !== 'S18') { continue; }
								if (journey.st !== 'Zürich, Bahnhof Stadelhofen') { continue; }

								trains.push(journey);
							}

							first = trains[0];
							second = trains[1];

							if (first) {
								if (first.minutes === 0) {
									messageKey = 's18_zero';
								} else if (first.minutes < 3) {
									if (second) {
										messageKey = 's18_wontmake';
									} else {
										messageKey = 's18_wontmake_nonext';
									}
								} else if (first.minutes < 7) {
									messageKey = 's18_tight';
								} else if (first.minutes >= 7) {
									messageKey = 's18_ok';
								}
							} else {
								messageKey = 's18_nonext';
							}

						} else {
							messageKey = 's18_nonext';
						}

					} else {
						messageKey = 's18_error';
					}

					messageParams = {};
					if (first) { messageParams.m = first.minutes; }
					if (first) { messageParams.t = first.ti; }
					if (second) { messageParams.m2 = second.minutes; }
					if (second) { messageParams.t2 = second.ti; }

					messageText = messages.get(messageKey, messageParams);

					y.sendMessage(function (error, msg) {
						logger.info('s18 message OK: ' + msg.id());
					}, messageText, { 'reply_to' : message.id() });
				}
			);
		}
	});


};

require('datejs');
var gw = require('googleweather');

var weatherLocation = 'Zurich, Switzerland';
var directions = {
	'N' : 'North', 
	'NE' : 'Northeast', 
	'E' : 'East', 
	'SE' : 'Southeast', 
	'S' : 'South', 
	'SW' : 'Southwest', 
	'W' : 'West', 
	'NW' : 'Northwest'
};

exports.init = function (y, config, messages, cron, logger) {
	messages.add('weather_now', "[condition]. It's [temperature]°C and humidity is at [humidity]%. There's wind from [wind_direction] at [wind_speed]km/h.");
	messages.add('weather_present', "[condition]. Temperatures are between [low_temperature]°C and [high_temperature]°C.");
	messages.add('weather_future', "[condition]. Temperatures will be between [low_temperature]°C and [high_temperature]°C.");
	messages.add('weather_past', "[condition]. Temperatures were between [low_temperature]°C and [high_temperature]°C.");
	messages.add('weather_dateproblem', "Sorry, I don't get it. Which day was that?");
	messages.add('weather_unknown', "Only the Gods know.");

	var yammer_account = config.yammer[config.yammer_account];

	y.on('message', function (message) {
		var thread = y.thread(message.threadId());

		if (/\b(weather|forecast)\b/i.test(message.plainBody()) || thread.property('type') == 'weather') {
			thread.setProperty('type', 'weather');
			
			var dateString = extractDateString(message.plainBody());

			if (dateString != null) {
				dateString = dateString.replace(/^\s+|\s+$/g, '');
				var d = Date.parse(dateString).toString('yyyy-MM-dd');

				if (dateString == 'now') {
					gw.get(function (current, forecast) {
						var weatherMessage = messages.get('weather_now', {
							'condition' : current.condition, 
							'temperature' : current.temperature, 
							'humidity' : current.humidity, 
							'wind_direction' : directions[current.wind.direction], 
							'wind_speed' : current.wind.speed
						});

						y.sendMessage(function (error, msg) {
							logger.info('weather message OK: ' + msg.id());
						}, weatherMessage, { 'reply_to' : message.id() });
					}, weatherLocation, Date.today().toString('yyyy-MM-dd'));

				} else {
					var messageType = 'weather_present';

					if (Date.parse(d).isAfter(Date.today())) {
						messageType = 'weather_future';
					} else if (Date.parse(d).isBefore(Date.today())) {
						messageType = 'weather_past';
					}

					gw.get(function (current, forecast) {
						if (typeof forecast != 'undefined') {
							var weatherMessage = messages.get(messageType, {
								'condition' : forecast.condition, 
								'low_temperature' : forecast.temperature.low, 
								'high_temperature' : forecast.temperature.high
							});

							y.sendMessage(function (error, msg) {
								logger.info('weather message OK: ' + msg.id());
							}, weatherMessage, { 'reply_to' : message.id() });

						} else {
							var weatherMessage = messages.get('weather_unknown');
							y.sendMessage(function (error, msg) {
								logger.info('weather message OK: ' + msg.id());
							}, weatherMessage, { 'reply_to' : message.id() });
						}
					}, weatherLocation, d);
				}

			} else {
				logger.warn('invalid date string');
				var weatherMessage = messages.get('weather_dateproblem');
				y.sendMessage(function (error, msg) {
					logger.info('weather message OK: ' + msg.id());
				}, weatherMessage, { 'reply_to' : message.id() });
			}

		}
	});
};

function extractDateString (str) {
	str = str.replace(/['"]/, '');
	var words = str.split(/[^a-z0-9']+/i);
	var c = 0;
	while (words.length >= 1) {

		var words2 = JSON.parse(JSON.stringify(words));
		while (words2.length >= 1) {
			if (Date.parse(words2.join(' ')) != null) {
				return words2.join(' ');
			}

			words2.pop();
		}
		words.splice(0, 1);
		c++;
	}

	return null;
}

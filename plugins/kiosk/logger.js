require('datejs');
var path = require('path');
var fs = require('fs');
var accounts = require('./accounts');
var Account = accounts.Account;
var Booking = require('./bookings').Booking;

var initialized = false;
var logFile = 'log.json';
var entries = [];

var init = function (users) {
	if (initialized) return;
	if (!exports.dataDir) return;

	var logFilePath = path.join(exports.dataDir, logFile);
	if (path.existsSync(logFilePath)) {
		var data = fs.readFileSync(logFilePath);
		entries = JSON.parse(data);
		initialized = true;
		return;
	}

	for (var userId in users) {
		var account = accounts.get(userId);
		var bookings = account.bookings();

		for (var i = 0; i < bookings.length; i++) {
			log(null, bookings[i]);
		}
	}

	initialized = true;
};

var persist = function () {
	if (!exports.dataDir) return;
	var logFilePath = path.join(exports.dataDir, logFile);
	fs.writeFile(logFilePath, JSON.stringify(entries), function (err) {
		if (err) throw err;
	});
};

var log = function () {
	var entry = {};

	entry.time = Date.now();

	for( var i = 0; i < arguments.length; i++ ) {

		if (i === 0 && arguments[i] && typeof arguments[i] == 'number' && arguments[i] % 1 == 0) {
			entry.user = arguments[i];
			continue;
		}

		if (arguments[i] && arguments[i] instanceof Booking) {
			entry.booking = arguments[i].data();
			continue;
		}
	}

	if (!entry.user) entry.user = null;

	entries.push(entry);
	persist();
};

exports.dataDir = null;
exports.init = init;

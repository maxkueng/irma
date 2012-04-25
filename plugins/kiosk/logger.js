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
		console.log(logFilePath);
	if (path.existsSync(logFilePath)) {
		var data = fs.readFileSync(logFilePath, 'utf8');
		entries = JSON.parse(data);
		initialized = true;
		return;
	}

	for (var userId in users) {
		var account = accounts.get(userId);
		var bookings = account.bookings();

		for (var i = 0; i < bookings.length; i++) {
			entries.push(entry(null, account, bookings[i]));
		}

		persist();
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

var entry = function () {
	var e = {};
	e.time = Date.now();
	for( var i = 0; i < arguments.length; i++ ) {
		if (i === 0 && arguments[i] && arguments[i] % 1 == 0) {
			e.user = arguments[i];
			continue;
		}

		if (arguments[i] && arguments[i] instanceof Booking) {
			e.booking = arguments[i].data();
			continue;
		}

		if (arguments[i] && arguments[i] instanceof Account) {
			e.accountId = arguments[i].id();
			continue;
		}
	}

	if (!e.user) e.user = null;

	return e;
};

var log = function () {
	var e = entry.apply(this, Array.prototype.slice.call(arguments));
	entries.push(e);
	persist();
};

exports.dataDir = null;
exports.init = init;
exports.entries = function () { return entries; };
exports.log = log;

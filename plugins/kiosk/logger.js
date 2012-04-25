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

	for (var userId in users) {
		var account = accounts.get(userId);
		var bookings = account.bookings();

		for (var i = 0; i < bookings.length; i++) {
			log(null, bookings[i]);
		}
	}

	initialized = true;
};

var log = function () {
	var entry = {};

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
};

exports.dataDir = null;
exports.init = init;

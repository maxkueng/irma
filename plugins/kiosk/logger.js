"use strict";

require('datejs');
var path = require('path');
var fs = require('fs');
var accounts = require('./accounts');
var Account = accounts.Account;
var Booking = require('./bookings').Booking;

var initialized = false;
var logFile = 'log.json';
var entries = [];

var entry = function () {
	var e = {};

	for (var i = 0; i < arguments.length; i++) {
		if (i === 0 && arguments[i] && arguments[i] % 1 === 0) {
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

	if (!e.user) { e.user = null; }

	return e;
};

var persist = function () {
	if (!exports.dataDir) { return; }

	var logFilePath = path.join(exports.dataDir, logFile);
	fs.writeFile(logFilePath, JSON.stringify(entries), function (err) {
		if (err) { throw err; }
	});
};

var init = function (users) {
	var logFilePath, data, account, bookings, e;

	if (initialized) { return; }
	if (!exports.dataDir) { return; }

	logFilePath = path.join(exports.dataDir, logFile);
	if (path.existsSync(logFilePath)) {
		data = fs.readFileSync(logFilePath, 'utf8');
		entries = JSON.parse(data);
		initialized = true;
		return;
	}

	for (var userId in users) {
		if (users.hasOwnProperty(userId)) {
			account = accounts.get(userId);
			bookings = account.bookings();

			for (var i = 0; i < bookings.length; i++) {
				e = entry(null, account, bookings[i]);
				e.time = bookings[i].time();
				entries.push(e);
			}

			persist();
		}
	}

	initialized = true;
};

var log = function () {
	var e = entry.apply(this, Array.prototype.slice.call(arguments));
	e.time = Date.now();
	entries.push(e);
	persist();
};

exports.dataDir = null;
exports.init = init;
exports.entries = function () { return entries; };
exports.log = log;

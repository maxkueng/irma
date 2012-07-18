"use strict";

require('datejs');
var path = require('path');
var fs = require('fs');
var bookings = require('./bookings');
var accounts = {};
var Booking = bookings.Booking;

var Account = function (userId) {
	this._userId = userId;
	this._accountFile = path.join(exports.dataDir, userId + '.json');
	this._bookings = null;
	this._load();
};

Account.prototype._load = function () {
	if (this._bookings) { return; }

	if (path.existsSync(this._accountFile)) {
		var data = fs.readFileSync(this._accountFile, 'UTF-8');
		this._bookings = JSON.parse(data);

	} else {
		this._bookings = [];
	}

	return;
};

Account.prototype._persist = function (path, callback) {
	if (typeof callback === 'undefined') {
		callback = path;
		path = null;
	}

	if (!path) { path = this._accountFile; }

	var data = JSON.stringify(this._bookings, null, '\t');

	fs.writeFile(path, data, function (err) {
		if (err) { throw err; }
		callback();
	});
};

Account.prototype._bookingIndex = function (bookingId) {
	var booking;

	for (var i = 0; i < this._bookings.length; i++) {
		booking = this._bookings[i];
		if (booking.id === bookingId) { return i; }
	}

	return -1;
};

Account.prototype.userId = function () {
	return this._userId;
};

Account.prototype.id = function () {
	return this.userId();
};

Account.prototype.balance = function () {
	var balance, bookings;

	balance = 0;
	bookings = this.bookings();

	for (var i = bookings.length - 1; i >= 0; --i) {
		balance += parseInt(bookings[i].amount(), 10);
	}

	return balance;
};

Account.prototype.book = function (booking, callback) {
	this._bookings.push(booking.data());
	this._persist(function () {
		callback(false, booking.id());
	});
};

Account.prototype.updateBooking = function (bookingId, booking, callback) {
	var idx = this._bookingIndex(bookingId);
	if (idx === -1) { callback(true); return; }

	this._bookings[idx] = booking.data();
	this._persist(function () {
		callback(false);
	});
};

Account.prototype.booking = function (bookingId) {
	var idx, booking;

	idx = this._bookingIndex(bookingId);
	if (idx === -1) { return null; }

	booking = this._bookings[idx];
	return new Booking(booking);
};

Account.prototype.bookings = function () {
	var bookings = [];
	for (var i = 0; i < this._bookings.length; i++) {
		bookings.push(new Booking(this._bookings[i]));
	}

	return bookings;
};

Account.prototype.reverse = function (bookingId, callback) {
	var self, booking;

	self = this;
	booking = this.booking(bookingId);
	booking.setReversed();

	this.updateBooking(booking.id(), booking, function () {
		var reverse = new Booking({
			'id' : bookings.uuid(),
			'itemId' : ( (booking.itemId()) ? booking.itemId() : null ),
			'time' : Date.now(),
			'amount' : booking.amount() * -1,
			'name' : 'Reverse #' + booking.id(),
			'description' : 'Reversed booking #' + booking.id() + ' (' + booking.name() + ')',
			'type' : 'reverse',
			'relatedBookingId' : booking.id()
		});

		self.book(reverse, function () {
			callback(false, reverse.id());
		});
	});
};

Account.prototype.deposit = function (amount, callback) {
	var booking = new Booking({
		'id' : bookings.uuid(),
		'time' : Date.now(),
		'amount' : amount,
		'name' : 'Deposit',
		'description' : 'Deposit',
		'type' : 'deposit',
		'admin' : true
	});

	this.book(booking, function () {
		callback(false, booking.id());
	});
};

Account.prototype.withdraw = function (amount, callback) {
	var booking = new Booking({
		'id' : bookings.uuid(),
		'time' : Date.now(),
		'amount' : amount * -1,
		'name' : 'Withdrawal',
		'description' : 'Withdrawal',
		'type' : 'withdrawal',
		'admin' : true
	});

	this.book(booking, function () {
		callback(false, booking.id());
	});
};

Account.prototype.initialize = function (amount, callback) {
	this._bookings = [];

	var booking = new Booking({
		'id' : bookings.uuid(),
		'itemId' : null,
		'time' : Date.now(),
		'amount' : amount,
		'name' : 'Account initialization',
		'description' : 'Account initialization',
		'type' : 'initialization',
		'admin' : true
	});

	this.book(booking, function () {
		callback(false, booking.id());
	});

};

var pad = function (n) {
	return (n < 10) ? '0' + n : n;
};

Account.prototype.archive = function (callback) {
	var i, self, balance, now, archFile;

	self = this;
	balance = this.balance();
	now = new Date();
	i = 0;

	do {
		archFile = path.join(exports.dataDir, this._userId + '_' + now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + i + '.json');
		i++;
	} while (path.existsSync(archFile));

	this._persist(archFile, function (err) {
		self._bookings = [];

		var booking = new Booking({
			'id' : bookings.uuid(),
			'itemId' : null,
			'time' : Date.now(),
			'amount' : balance,
			'name' : 'Archive ' + now.toString('MMMyy'),
			'description' : 'Monthly archive for ' + now.toString('MMMM yyyy'),
			'type' : 'month summary',
			'automatic' : true
		});

		self.book(booking, function () {
			callback(false, booking.id());
		});
	});
};

var get = function (userId) {
	if (!accounts[userId]) {
		accounts[userId] = new Account(userId);
	}

	return accounts[userId];
};

var all = function () {
	return accounts;
};

exports.dataDir = null;
exports.get = get;
exports.all = all;
exports.Account = Account;

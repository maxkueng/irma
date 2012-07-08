"use strict";

var uuid = require('node-uuid');

var Booking = function (data) {
	if (typeof data.reversed === 'undefined') { data.reversed = false; }
	if (typeof data.automatic === 'undefined') { data.automatic = false; }
	if (typeof data.admin === 'undefined') { data.admin = false; }
	this._data = data;
};

Booking.prototype.data = function () { return this._data; };
Booking.prototype.id = function () { return this._data.id; };
Booking.prototype.itemId = function () { return this._data.itemId; };
Booking.prototype.time = function () { return this._data.time; };
Booking.prototype.name = function () { return this._data.name; };
Booking.prototype.description = function () { return this._data.description; };
Booking.prototype.type = function () { return this._data.type; };
Booking.prototype.amount = function () { return this._data.amount; };
Booking.prototype.reversed = function () { return this._data.reversed; };
Booking.prototype.setReversed = function () { this._data.reversed = true; };
Booking.prototype.relatedBookingId = function () { return this._data.relatedBookingId; };
Booking.prototype.automatic = function () { return this._data.automatic; };
Booking.prototype.setAutomatic = function () { this._data.automatic = true; };
Booking.prototype.admin = function () { return this._data.admin; };
Booking.prototype.setAdmin = function () { this._data.admin = true; };

exports.uuid = function () { return uuid.v1().substr(0, 8); };
exports.Booking = Booking;

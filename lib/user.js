"use strict";

var util = require('util');
var events = require('events');

var User = function (data) {
	this._data = data;
};

User.prototype.id = function () {
	return this._data.id;
};

User.prototype.isAdmin = function () {
	return this._data.admin;
};

User.prototype.isActive = function () {
	return (this._data.state === 'active');
};

User.prototype.name = function () {
	return this._data.name;
};

User.prototype.username = function () {
	return '@' + this._data.name;
};

User.prototype.fullName = function () {
	return this._data.full_name;
};

User.prototype.email = function () {
	var email;

	for (var i = 0; i < this._data.contact.email_addresses.lengh; i++) {
		email = this._data.contact.email_addresses[i];
		if (email.type === 'primary') {
			return email.address;
		}
	}

	return null;
};

User.prototype.mugshot = function (width, height) {
	var url;

	if (typeof width === 'undefined' || typeof height === 'undefined') {
		return this._data.mugshot_url;
	}

	url = this._data.mugshot_url_template;
	if (!/[0-9]+$/.test(url)) { return this._data.mugshot_url; }

	width = parseInt(width, 10);
	height = parseInt(height, 10);

	url = url.replace('{width}', width);
	url = url.replace('{height}', height);

	return url;
};

User.prototype.mobilePhone = function () {
	var phone;

	for (var i = 0; i < this._data.contact.phone_numbers; i++) {
		phone = this._data.contact.phone_numbers[i];
		if (phone.type === 'mobile') {
			return phone.number;
		}
	}

	return null;
};

exports.User = User;

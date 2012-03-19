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
	return (this._data.state == 'active');
};

User.prototype.username = function () {
	return '@' + this._data.name;
};

User.prototype.fullName = function () {
	return this._data.full_name;
};

User.prototype.email = function () {
	for (var i in this._data.contact.email_addresses) {
		var email = this._data.contact.email_addresses[i];
		if (email.type == 'primary') {
			return email.address;
		}
	}

	return null;
};

User.prototype.mobilePhone = function () {
	for (var i in this._data.contact.phone_numbers) {
		var phone = this._data.contact.phone_numbers[i];
		if (phone.type == 'mobile') {
			return phone.number;
		}
	}

	return null;
};

exports.User = User;
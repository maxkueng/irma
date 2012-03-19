var util = require('util');
var events = require('events');

var Thread = function (data) {
	events.EventEmitter.call(this);

	this._data = data;
};

util.inherits(Thread, events.EventEmitter);

Thread.prototype.id = function () {
	return this._data.id;
};

Thread.prototype.messageId = function () {
	return this._data.message_id;
};

Thread.prototype.originatorId = function () {
	return this._data.originator_id;
};

Thread.prototype.data = function () {
	return this._data;
};

Thread.prototype.property = function (key) {
	if (this._data.properties && this._data.properties[key]) {
		return this._data.properties[key];
	}

	return null;
};

Thread.prototype.setProperty = function (key, value) {
	if (!this._data.properties) {
		this._data.properties = {};
	}

	this._data.properties[key] = value;
};

Thread.prototype.addMessage = function (message) {
	if (typeof this._data.messages == 'undefined') {
		this._data.messages = [];
	}
	this._data.messages.push(message.id());

	this.emit('message', message);
};

exports.Thread = Thread;

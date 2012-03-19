var util = require('util');
var events = require('events');

var Message = function (data) {
	this._data = data;
};

Message.prototype.id = function () {
	return this._data.id;
};

Message.prototype.senderId = function () {
	return this._data.sender_id;
};

Message.prototype.threadId = function () {
	return this._data.thread_id;
};

Message.prototype.isDirect = function () {
	return this._data.direct_message;
};

Message.prototype.plainBody = function () {
	return this._data.body.plain;
};

Message.prototype.parsedBody = function () {
	return this._data.body.parsed;
};

Message.prototype.data = function () {
	return this._data;
};

exports.Message = Message;

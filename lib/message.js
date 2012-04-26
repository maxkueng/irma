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

Message.prototype.createdAt = function () {
	return Date.parse(this._data.created_at);
};

Message.prototype.plainBody = function () {
	return this._data.body.plain;
};

Message.prototype.parsedBody = function () {
	return this._data.body.parsed;
};

Message.prototype.likes = function () {
	if (!this._data.liked_by) return 0;
	
	return this._data.liked_by.count;
};

Message.prototype.likers = function () {
	if (!this._data.liked_by) return [];

	var users = [];
	for (var i = 0; i < this._data.liked_by.names.length; i++) {
		users.push(this._data.liked_by.names[i].permalink);
	}

	return users;
};

Message.prototype.data = function () {
	return this._data;
};

exports.Message = Message;

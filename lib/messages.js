"use strict";

var path = require('path');
var fs = require('fs');

var messages = {};
var messageTypes = [];
var usedMessages = {};
var profileDir = '';

var loadUsedMessages = function (type) {
	var filePath, usedMessagesData;

	filePath = profileDir + '/used_messages_' + type + '.json';
	if (path.existsSync(filePath)) {
		usedMessagesData = fs.readFileSync(filePath, 'utf8');
		usedMessages[type] = JSON.parse(usedMessagesData);
	}
};

exports.init = function (profDir) {
	profileDir = profDir;
};

exports.add = function (type, message) {
	if (typeof messages[type] === 'undefined') {
		messages[type] = [];
	}

	if (typeof usedMessages[type] === 'undefined') {
		usedMessages[type] = [];
		loadUsedMessages(type);
	}

	messages[type].push(message);
};

exports.get = function (type, vars) {
	var msgs, usedMsgs, message, filePath, regex;

	msgs = messages[type];
	usedMsgs = usedMessages[type];
	message = null;

	for (var i = 0; i < msgs.length; i++) {
		if (usedMsgs.indexOf(i) === -1) {
			message = msgs[i];
			usedMsgs.push(i);

			filePath = profileDir + '/used_messages_' + type + '.json';
			fs.writeFileSync(filePath, JSON.stringify(usedMsgs, null, '\t'));

			break;
		}

		if (message === null) {
			i = Math.floor(Math.random() * msgs.length);
			message = msgs[i];
		}
	}

	if (typeof vars !== 'undefined') {
		for (var key in vars) {
			if (vars.hasOwnProperty(key)) {
				regex = new RegExp('\\[' + key + '\\]', 'g');
				message = message.replace(regex, vars[key]);
			}
		}
	}

	return message;
};

var path = require('path');
var fs = require('fs');

var messages = {};
var messageTypes = [];
var usedMessages = {};
var profileDir = '';

exports.load = function (filePath, profDir) {
	profileDir = profDir;

	if (path.existsSync(filePath)) {
		var messagesData = fs.readFileSync(filePath, 'utf8');
		messages = JSON.parse(messagesData);

		for (var key in messages) {
			messageTypes.push(key);
			usedMessages[key] = [];

			var filePath = profileDir + '/used_messages_' + key + '.json';
			if (path.existsSync(filePath)) {
				var usedMessagesData = fs.readFileSync(filePath, 'utf8');
				usedMessages[key] = JSON.parse(usedMessagesData);
			}
		}

		return true;
	}

	return false;
};

exports.get = function (type, vars) {
	var msgs = messages[type];
	var usedMsgs = usedMessages[type];

	var message = null;

	for (var i in msgs) {
		if (usedMsgs.indexOf(i) == -1) {
			message = msgs[i];
			usedMsgs.push(i);

			var filePath = profileDir + '/used_messages_' + type + '.json';
			fs.writeFileSync(filePath, JSON.stringify(usedMsgs));

			break;
		}

		if (message == null) {
			var i = Math.floor(Math.random() * msgs.length);
			message = msgs[i];
		}
	}

	if (typeof vars != 'undefined') {
		for (var key in vars) {
			var regex = new RegExp('\\[' + key + '\\]', 'g');
			message = message.replace(regex, vars[key]);
		}
	}

	return message;
};

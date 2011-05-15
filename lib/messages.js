var path = require('path');
var fs = require('fs');

var messages = {};
var messageTypes = [];
var usedMessages = {};
var profileDir = '';

var loadUsedMessages = function (type) {
	var filePath = profileDir + '/used_messages_' + type + '.json';
	if (path.existsSync(filePath)) {
		var usedMessagesData = fs.readFileSync(filePath, 'utf8');
		usedMessages[type] = JSON.parse(usedMessagesData);
	}
};

exports.init = function (profDir) {
	profileDir = profDir;
};

exports.add = function (type, message) {
	if (typeof messages[type] == 'undefined') {
		messages[type] = [];
	}

	if (typeof usedMessages[type] == 'undefined') {
		usedMessages[type] = [];
		loadUsedMessages(type);
	}

	messages[type].push(message);
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

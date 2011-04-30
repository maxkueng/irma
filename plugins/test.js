exports.init = function (y, config, messages, cron, logger) {
	messages.add('test', 'This is a test');
	messages.add('test', 'This is the biggest test yet');
	messages.add('test', 'I\'m so testing this');
};

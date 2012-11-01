"use strict";

exports.init = function (y, config, messages, cron, logger) {
	messages.add('kill_reboot_confirm', "I'll be back.");

	y.on('message', function (message) {
		if (/!reboot\b/i.test(message.plainBody())) {
			logger.info("!reboot");

			var rebootConfirmMessage = messages.get('kill_reboot_confirm');

			y.sendMessage(function (err, msg) {
				logger.info('sending reboot confirm message: OK');
				var thread = y.thread(msg.threadId());
				thread.setProperty('type', 'reboot');
				thread.setProperty('status', 'open');
				y.persistThread(thread);
				logger.warn('exiting');
				process.exit(0);

			}, rebootConfirmMessage, { 'reply_to' : message.id() });
		}
	});

};

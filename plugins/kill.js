"use strict";

exports.init = function (y, config, messages, cron, logger) {
	messages.add('kill_reboot_confirm', "I'll be back.");
	messages.add('kill_reboot_rebooted', "I'm back.");
	messages.add('kill_reboot_rebooted', "I'm back from the reboot. All fresh and shiny :)");

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

	y.on('threadloaded', function (thread) {
		if (thread.property('type') === 'reboot' && thread.property('status') === 'open') {
			var rebootedMessage = messages.get('kill_reboot_rebooted');

			y.sendMessage(function (err, msg) {
				logger.info('sending rebooted message: OK');
				var thread = y.thread(msg.threadId());
				thread.setProperty('status', 'closed');
				y.persistThread(thread);

			}, rebootedMessage, { 'reply_to' : thread.id() });
		}
	});

};

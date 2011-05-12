exports.init = function (y, config, messages, cron, logger) {
	messages.add('kill_bye', "Alright, I'm off.");
	messages.add('kill_bye', "Bye bye.");

	messages.add('kill_permissiondenied', "You can't kill me! Only an admin can do that.");

	var yammer_account = config.yammer[config.yammer_account];

	y.on('message', function (message) {
		if (/\b(kill|die|shut\s*down)\b/i.test(message.plainBody())) {
			var thread = y.thread(message.threadId());
			thread.setProperty('type', 'kill');

			if (message.senderId() == yammer_account.admin_user_id) {
				var killMessage = messages.get('kill_bye');

				y.sendMessage(function (msg) {
					logger.info('sending kill message: OK');
					thread.setProperty('status', 'closed');
					y.persistThread(thread);
					logger.warn('exiting');
					process.exit(0);
				}, killMessage, { 'reply_to' : message.id() });

			} else {
				var permissiondeniedMessage = messages.get('kill_permissiondenied');
				logger.warn('permission denied for kill command');

				y.sendMessage(function (msg) {
					thread.setProperty('status', 'closed');
					y.persistThread(thread);
				}, permissiondeniedMessage, { 'reply_to' : message.id() });
			}
		}
	});
};

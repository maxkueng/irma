require('datejs');

exports.init = function (y, config, messages, cron, logger) {
	messages.add('veggie', "Oh my God it's Veggie-Thursday, yeah!! Go out, hug a bear, run with the wolves, spread love!\nGood karma."); 
	messages.add('veggie', "It's Veggie-Thursday, yeah!! Kiss the Soyboy, fly with the Tofucopter and touch the sun!"); 
	messages.add('veggie', "Hey hey hey, it's Veggie-Day!! Be a Tofuman and safe the planet!"); 
	messages.add('veggie', "It's Thursday, my favorite day. I get to remind you it's Veggie-Day!");
	messages.add('veggie', "Oh yeah, it's Veggie Day!! Stop the blod spill, take the tofu pill, high-five that critter, don't be a chicken hitter! Be magic, be happy!"); 
	messages.add('veggie', "A Tofu a day, keeps the doctor away!"); 
	messages.add('veggie', "I love Tofu! And I know you'll love it, too.\nSo don't be shy, you just have to try!"); 
	messages.add('veggie', "Eat carrots not rabbits, man!"); 
	messages.add('veggie', "Ladies and gentlemen, may I have your attention please! It's Fakemeat Day, yay!"); 
	messages.add('veggie', "Mayday mayday, Tofucopter captain speaking. Aaaaahh.. five Tofurockets incoming!!! Can barely see with all the soy fog. Asking for permission to land."); 
	messages.add('veggie', "Balanciere dein Leben mit dem richtigen Essen,\nich hoffe nur du willst doch keine Tiere fressen!\nAlle fressen Fleisch, das zieht dich runter man!\nIch bezweifle stark das man so besser Leben sehen kann.");
	messages.add('veggie', "Oh happy day it's Tofu-Day");

	new cron.CronJob('*/30 * * * * *', function () {
		//if (Date.today().is().thursday()) {
		if (true) {
			logger.info('sending veggie message');
			var message = messages.get('veggie');

			y.sendMessage(function (error, message) {
				logger.info('veggie message OK: ' + message.id());
				var thread = y.thread(message.threadId());
				thread.setProperty('type', 'veggie');
				thread.setProperty('status', 'closed');
				y.persistThread(thread);
			}, message);
		}
	});
};

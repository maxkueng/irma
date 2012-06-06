exports.init = function (y, config, messages, cron, logger) {
	var stocks = require('./kiosk/stocks');
	var Stock = stocks.Stock;

	messages.add('spaghetti_stockwarning_critical', 'Warning! Spaghetti stock health is [health]. We have about [stock] grams left. Average consumption per week is [avg_consumption] grams. We can still feed [stock_rations] people with this. It might work out but there is a high probability that it won\'t.\nWho\'s going to restock? I\'m only a stupid robot and can\'t do it myself.');
	messages.add('spaghetti_stockwarning_bad', 'Warning! Spaghetti stock health is [health]. We have about [stock] grams left. Average consumption per week is [avg_consumption] grams. We can still feed [stock_rations] people with this. It might work out but there is a high probability that it won\'t.\nWho\'s going to restock? I\'m only a stupid robot and can\'t do it myself.');

	new cron.CronJob('0 0 14 * * 4', function () {

		var stock = stocks.get('03032ac58f81');
		var stockInfo = stock.info();

		if (stockInfo.health == 'critical' || stockInfo.health == 'bad') {

			var stockMessage = messages.get('spaghetti_stockwarning_' + stockInfo.health, {
				'health' : stockInfo.health, 
				'stock' : stockInfo.stock, 
				'avg_consumption' : stockInfo.avgUnits, 
				'stock_rations' : Math.round((stockInfo.stock / 150) * 10) / 10
			});

			y.sendMessage(function (error, msg) {
				logger.info('spaghetti stockwarning message OK: ' + msg.id());
				var thread = y.thread(msg.threadId());
				thread.setProperty('type', 'spaghetti-stockwarning');
				thread.setProperty('status', 'closed');
				y.persistThread(thread);
			}, stockMessage);

		}
			
	});
};

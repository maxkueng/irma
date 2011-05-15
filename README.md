I.R.M.A. - Interactive Robotic Messagaging Assistant
====================================================

I.R.M.A. is chat bot for your [Yammer][yammer] network. I's written in
JavaScript and runs inside a [node.js][node] environment.

Features
--------

 - Public and direct messages
 - Timed messages
 - Thread management
 - Plugin architecture
 - None-boring messages

Dependencies
------------

Required none-core modules:

 - [cron][cron]

Some plugins require additional modules: 

 - [datejs][datejs]
 - [googleweather][googleweather]

Installation
------------

Get the code:

```sh
git clone git://github.com/maxkueng/irma.git
cd irma
```

Install dependencies:

```sh
sudo npm install . -g
```

Run:

```sh
bin/bot.js
```

Configuration
-------------

 - `yammer_account`: The name of your Yammer profile. This is custom and
   basically just points to the Yammer profile config. You can configure multiple
   Yammer accounts and choose one here.
 - `yammer.xxx`: Name of your Yammer profile. `yammer_account` points here.
 - `yammer.xxx.email`: The email address used with your yammer account.
 - `yammer.xxx.api.consumer_key`: Your Yammer API OAuth consumer key.
 - `yammer.xxx.api.consumer_secret`: Your Yammer API OAuth consumer secret.
 - `yammer.xxx.admin_user_id`: User ID of an admin. This is used by the _kill_
   plugin so only an admin can kill the bot.
 - `yammer.xxx.chef_user_id`: User ID of the spaghetti chef. You only need this
   if you're using the _spaghetti_ plugin.

You can add additional properties to the configuration file and access them in
your plugin code.

Here's what a configuration file might look like. It's usually located at
`./config.json`

```javascript
{
	"yammer_account" : "xxx", 
	"yammer" : {
		"xxx" : {
			"email" : "yourbot@yournetwork.com", 
			"api" : {
				"consumer_key" : "UkjUbkjBKVHJfGhygygGGG", 
				"consumer_secret" : "iuhuHYFUhvghyvJYfjhyVTDKbbVYTFytuyfUYvvVVVy"
			}, 
			"admin_user_id" : "1234567", 
			"chef_user_id" : "7654321"
		}
	}
}
```

Writing a Plugin
----------------

 - `y`: The instance of the Yammer client. Use it to send and receive messages.
 - `config`: The configuration object
 - `messages`: The none-boring messages manager used to add and get messages.
 - `cron`: The cron instance used to schedule code
 - `logger`: The logger instance

Here's what a plugin that does nothing might look like. `./plugins/nothing.js`

```javascript
exports.init = function (y, config, messages, cron, logger) {

//	Your plugin code goes here

};
```

### Managing Messages

The messages manager keeps a list of one or more messages per message type. This
means you can say the same thing in different ways so your bot will apear less
boring.

Example:

```javascript
messages.add('saysomething', 'Something');
messages.add('saysomething', 'Another thing');
messages.add('saysomething', 'Anything');

console.log(messages.get('saysomething')); // Will print one of the the above.
```

### Sending Messages

Send a message to your network:

```javascript
var messageText = messages.get('saysomething');

y.sendMessage(function (error, message) {
	logger.info('Sent message with ID ' + message.id());
}, messageText);
```
Reply to a message:

```javascript
var messageText = messages.get('saysomething');

y.sendMessage(function (errr, message) {
	logger.info('Sent message with ID ' + message.id());
}, messageText, { 'reply_to': 999876543 }); // <-- this is the message id
```

Send direct message:

```javascript
var messageText = messages.get('saysomething');

y.sendMessage(function (error, message) {
	logger.info('Sent message with ID ' + message.id());
}, messageText, { 'direct_to': 1234567 }); // <-- this is the user id
```

### Receiving Messages

Note: The bot will only receive messages that are either sent to it directly ore
mention it in the message body.

Receive channel message:

```javascript
y.on('message', function (message) {
	logger.info('Received message with ID ' + message.id());
});
```

Receive reply to a thread:

```javascript
var thread = y.thread(9997654767); // <-- this is the thread id

thread.on('message', function (message) {
	logger.info('Received message with ID ' + message.id());
});
```

### Scheduling Messages

Read the [cron documentation][crondoc]. Sending a message is the same as above.

Send a message at 9.15am every day:

```javascript
new cron.CronJob('0 15 9 * * *', function () {
	y.sendMessage(function (error, message) {
		logger.info('Sent message with ID ' + message.id());

	}, "This is the daily announcement!");
});
```

### Logging

Examples:

```javascript
logger.info('Something happened');
logger.warn('Something strange happened');
logger.error('Something bad happened');
```


### More?

More documentation will be added some time in the future. For now, please look
at the existing plugins. It's easy. You'll get it.

[node]: http://nodejs.org/
[yammer]: https://www.yammer.com/
[datejs]: http://www.datejs.com/
[cron]: https://github.com/ncb000gt/node-cron
[crondoc]: https://github.com/ncb000gt/node-cron#readme
[googleweather]: https://github.com/maxkueng/node-googleweather

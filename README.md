I.R.M.A. - Interactive Robotic Messagaging Assistant
====================================================

I.R.M.A. is chat bot for your [Yammer][yammer] network. It's written in
JavaScript and runs inside a [node.js][node] environment.

Features
--------

 - **Public and direct messages**
   Send public messages to company feed or private messages directly to
   a specific user.
 - **Timed messages**
   Schedule messages and actions for a certain time or interval using
   the internal cron-like scheduler.
 - **Thread management**
   Store custom data to a message thread, categorize threads by type,
   open and close threads.
 - **Plugin architecture**
   Write plugins to handle messages and reply to them - or other things.
 - **None-boring messages**
   Have different messages for the same message type. The bot will use a
   different message text every time to appear less boring.

Plugins
-------

I.R.M.A. comes with a small number of plugins:

 - **spaghetti**
   Asks everyone in the network if they wish to join the spaghetti lunch. Just
   before lunch time it counts all the replies and tells the chef how many
   people he should cook for.
 - **veggie** 
   Announces every Thursday that it's Veggie-Day.
 - **weather** 
   If asked, looks up the weather for a specific date using the Google weather
   API.
 - **webinterface**
   Provides a web interface and shows open and closed threads, active Yammer
   account and PID. This is mainly for debugging purposes.
 - **kill** 
   Allows an admin to shut down the bot by sending a Yammer message.
 - **s18**
   Tells you when the next S18 train departs from the Zollikerberg station.
 - **kiosk**
   Manages accounts for a company-internal store. Provides a mobile web
   interface to buy and restock goods.
   

Dependencies
------------

Required none-core modules:

 - [cron][cron]
 - request

Some plugins require additional modules: 

 - [datejs][datejs]
 - [googleweather][googleweather]
 - express
 - ejs
 - node-uuid
 - jsdom
 - aspsms

Installation
------------

Get the code:

```sh
git clone git://github.com/maxkueng/irma.git
cd irma
```

Install dependencies:

```sh
npm install
```

Run:

```sh
npm start
```

Configuration
-------------

Copy the distribution configuration file and edit it:

```sh
cp config.dist.json config.json
vim config.json
```

 - `yammer.email`: The email address used with your yammer account.
 - `yammer.api.consumer_key`: Your Yammer API OAuth consumer key.
 - `yammer.api.consumer_secret`: Your Yammer API OAuth consumer secret.
 - `plugins` : An array of plugin names to be loaded
 - `spaghetti.chef_user_id`: User ID of the spaghetti chef. You only need this
   if you're using the _spaghetti_ plugin.
 - `webinterface.ip`: IP the web interface plugin should listen on.
 - `webinterface.port`: Port the web interface plugin should listen on.

You can add additional properties to the configuration file and access them in
your plugin code.

Here's what a configuration file might look like. It's usually located at
`./config.json`

```javascript
{
	"yammer" : {
		"email" : "your.bot@yournetwork.com", 
		"api" : {
			"consumer_key" : "UkjUbkjBKVHJfGhygygGGG", 
			"consumer_secret" : "iuhuHYFUhvghyvJYfjhyVTDKbbVYTFytuyfUYvvVVVy"
		}
	}, 
	"plugins" : [
		"webinterface", 
		"spaghetti"
	]
	"webinterface" : {
		"ip" : "0.0.0.0", 
		"port" : 1337
	}, 
	"spaghetti" : {
		"cron_open" : "0 0 9 * * 5", 
		"cron_close" : "0 45 11 * * 5", 
		"chef_user_id" : "777124"
	}
}
```

Please node that the _cron_ module has a bug. Sunday is `1`, not `0`. So `5` is Thursday, not Friday.

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

	logger.info("Initializing the nothing plugin. Whoooo!!");

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

messages.add('tellthetime', 'The time is [time].');
messages.add('tellthetime', 'It is exactly [time].');

console.log(messages.get('saysomething')); // Will print one of the the above.

console.log(messages.get('tellthetime', {
	'time' : new Date()
}));
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

Note: The bot will only receive messages that are either sent to it directly or
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

var util = require('util');
var events = require('events');
var request = require('request');
var os = require('os');
var querystring = require('querystring');
var fs = require('fs');
var path = require('path');
var timers = require('timers');

var Yammer = function (userEmail, consumerKey, consumerSecret, authorizeCallback) {
	events.EventEmitter.call(this);

	this._appName = 'AssistBot';
	this._appVersion = '0.1';

	this._userEmail = userEmail;
	this._consumerKey = consumerKey;
	this._consumerSecret = consumerSecret;
	this._serverHost = 'www.yammer.com';
	this._requestTokenURI = 'https://www.yammer.com/oauth/request_token';
	this._accessTokenURI = 'https://www.yammer.com/oauth/access_token';
	this._authorizeURI = 'https://www.yammer.com/oauth/authorize';
	this._authorizeCallback = authorizeCallback;
	this._oauthToken = null;
	this._oauthTokenSecret = null;
	this._oauthVerifier = null;
	this._accessToken = null;
	this._accessTokenSecret = null;
	this._currentUserId = null;
	this._threads = [];
	this._users = [];

	this.setupDataDirs();

	if (path.existsSync(this.profileDir() + '/oauth/access_tokens.json')) {
		var tokensData = fs.readFileSync(this.profileDir() + '/oauth/access_tokens.json', 'utf8');
		var tokens = JSON.parse(tokensData);
		this._accessToken = tokens.oauth_token;
		this._accessTokenSecret = tokens.oauth_token_secret;
	}
};

util.inherits(Yammer, events.EventEmitter);

Yammer.prototype._oauthHeaders = function (token, tokenSecret, verifier) {
	var self = this;
	
	var header = 'OAuth realm="", '
			+ 'oauth_consumer_key="' + self._consumerKey + '", ';

	if (token) {
		header += 'oauth_token="' + token + '", ';
	}

	header += 'oauth_signature_method="PLAINTEXT", '
			+ 'oauth_signature="' + self._consumerSecret
			+ '%26';

	if (tokenSecret) {
		header += tokenSecret;
	}

	header += '", '
			+ 'oauth_timestamp="' + new Date().getTime() + '", ';
			+ 'oauth_nonce="' + new Date().getTime() + '", ';

	if (verifier) {
		header += 'oauth_verifier="' +  verifier + '", ';
	}

	header += 'oauth_version="1.0"';

	return header;
};

Yammer.prototype._oauthRequestToken = function (requestedCallback) {
	var self = this;

	request({
		'method' : 'POST', 
		'uri' : self._requestTokenURI, 
		'headers' : {
			'User-Agent' : self.userAgent(), 
			'Content-Type' : 'application/x-www-form-urlencoded', 
			'Authorization' : self._oauthHeaders(null, null, null)
		}
	}, 
	function (error, response, body) {
		if (error) {
			var vars = querystring.parse(body);

			self._oauthToken = vars.oauth_token;
			self._oauthTokenSecret = vars.oauth_token_secret;

			var authorizeURI = self._authorizeURI + '?oauth_token=' + self._oauthToken;
			requestedCallback(authorizeURI);
		}
	});
};

Yammer.prototype._oauthAuthorize = function (verifier) {
	var self = this;

	request({
		'method' : 'POST', 
		'uri' : self._accessTokenURI, 
		'headers' : {
			'User-Agent' : self.userAgent(), 
			'Content-Type' : 'application/x-www-form-urlencoded', 
			'Authorization' : self._oauthHeaders(self._oauthToken, self._oauthTokenSecret, verifier)
		}
	}, 
	function (error, response, body) {
		if (!error && response.statusCode == 200) {
			var vars = querystring.parse(body);

			self._accessToken = vars.oauth_token;
			self._accessTokenSecret = vars.oauth_token_secret;

			fs.writeFileSync(self.profileDir() + '/oauth/access_tokens.json', JSON.stringify(vars));
			self.emit('loggedon');

		} else {
			util.puts('Authorization failed.');
			process.exit(1);
		}
	});
}

Yammer.prototype.userAgent = function () {
	return this._appName + '/' + this._appVersion
	              + ' (node/' + process.version
	              + '; ' + os.type() + '/' + os.release()
	              + ')';
};

Yammer.prototype.pollMessages = function (previousMessageId) {
	var self = this;

	var latestMessageId = 0;
	var latestMessageTime = 0;

	var uri = 'https://www.yammer.com/api/v1/messages.json';
	if (previousMessageId) {
		latestMessageId = previousMessageId;
		uri += '?newer_than=' + previousMessageId;
	}

	request({
		'method' : 'GET', 
		'uri' : uri, 
		'headers' : {
			'User-Agent' : self.userAgent(), 
			'Authorization' : self._oauthHeaders(self._accessToken, self._accessTokenSecret, null)
		}
	}, 
	function (error, response, body) {
		if (!error && response.statusCode == 200) {
			var data = JSON.parse(body);

			if (data.meta) {
				self._currentUserId = data.meta.current_user_id;
			}

			if (data.messages) {
				for (var i = 0; i < data.messages.length; i++) {
					var messageTime = Date.parse(data.messages[i].created_at);			
					if (messageTime > latestMessageTime) {
						latestMessageTime = messageTime;
						latestMessageId = data.messages[i].id;
					}

					var message = new Message(data.messages[i]);
					if (self.messageIsForMe(message) && self.messageIsUnread(message)) {
						self.persistMessage(message);
						var thread = self.createThread(message);
						thread.addMessage(message);
						self.emit('message', message);
					}
				}
			}

		} else {
			self.emit('error', { 
				'method' : 'pollMessages', 
				'error' : error, 
				'body' : body
			});
		}

		timers.setTimeout(function () {
			self.pollMessages(latestMessageId);
		}, 30000);
	});
};

Yammer.prototype.pollPrivateMessages = function (previousMessageId) {
	var self = this;

	var latestMessageId = 0;
	var latestMessageTime = 0;

	var uri = 'https://www.yammer.com/api/v1/messages/private.json';
	if (previousMessageId) {
		latestMessageId = previousMessageId;
		uri += '?newer_than=' + previousMessageId;
	}

	request({
		'method' : 'GET', 
		'uri' : uri, 
		'headers' : {
			'User-Agent' : self.userAgent(), 
			'Authorization' : self._oauthHeaders(self._accessToken, self._accessTokenSecret, null)
		}
	}, 
	function (error, response, body) {
		if (!error && response.statusCode == 200) {
			var data = JSON.parse(body);

			if (data.meta) {
				self._currentUserId = data.meta.current_user_id;
			}

			if (data.messages) {
				for (var i = 0; i < data.messages.length; i++) {
					var messageTime = Date.parse(data.messages[i].created_at);			
					if (messageTime > latestMessageTime) {
						latestMessageTime = messageTime;
						latestMessageId = data.messages[i].id;
					}

					var message = new Message(data.messages[i]);
					if (self.messageIsForMe(message) && self.messageIsUnread(message)) {
						self.persistMessage(message);
						var thread = self.createThread(message);
						thread.addMessage(message);
						self.emit('message', message);
					}
				}
			}

		} else {
			self.emit('error', { 
				'method' : 'pollPrivateMessages', 
				'error' : error, 
				'body' : body
			});
		}

		timers.setTimeout(function () {
			self.pollPrivateMessages(latestMessageId);
		}, 30000);
	});
};

Yammer.prototype.sendMessage = function (callback, text, options) {
	var self = this;

	var data = {};
	data.body = text;
	if (typeof options != 'undefined') {
		if (typeof options.reply_to != 'undefined') {
			data.replied_to_id = options.reply_to;
		}

		if (typeof options.direct_to != 'undefined') {
			data.direct_to_id = options.direct_to;
		}
	}

	request({
		'method' : 'POST', 
		'uri' : 'https://www.yammer.com/api/v1/messages.json', 
		'headers' : {
			'User-Agent' : self.userAgent(), 
			'Authorization' : self._oauthHeaders(self._accessToken, self._accessTokenSecret, null)
		}, 
		'body' : querystring.stringify(data), 
	}, 
	function (error, response, body) {
		if (!error && response.statusCode == 201) {
			var data = JSON.parse(body);
			if (data.messages && data.messages.length > 0) {
				var message = new Message(data.messages[0]);

				fs.writeFileSync(self.profileDir() + '/messages/sent/message_' + message.id() + '.json', JSON.stringify(message.data()));
				self.createThread(message);

				callback(null, message);
			}

		} else {
			self.emit('error', { 
				'method' : 'sendMessage', 
				'error' : error, 
				'body' : body
			});
		}
	});
}

Yammer.prototype.loadUsers = function () {
	var self = this;

	request({
		'method' : 'GET', 
		'uri' : 'https://www.yammer.com/api/v1/users.json', 
		'headers' : {
			'User-Agent' : self.userAgent(), 
			'Authorization' : self._oauthHeaders(self._accessToken, self._accessTokenSecret, null)
		}
	}, 
	function (error, response, body) {
		if (!error && response.statusCode == 200) {
			var users = JSON.parse(body);

			if (users) {
				for (var i = 0; i < users.length; i++) {
					var user = new User(users[i]);
					self._users[user.id()] = user;
				}
			}

			self.emit('usersloaded');

		} else {
			self.emit('error', { 
				'method' : 'Yammer.loadUsers', 
				'error' : error, 
				'body' : body
			});
		}
	});
};

Yammer.prototype.user = function (userId) {
	if (this._users[userId]) {
		return this._users[userId];
	}

	return null;
};

Yammer.prototype.users = function () {
	return this._users;
};

Yammer.prototype.logon = function () {
	var self = this;

	if (self._accessToken && self._accessTokenSecret) {
		self.emit('loggedon');

	} else {
		this._oauthRequestToken(function (authorizeURI) {
			self._authorizeCallback(authorizeURI, function (verifier) {
				verifier = verifier.replace(/(\n|\r)+$/, '');
				self._oauthAuthorize(verifier);
			});
		});
	}

	this.loadThreads();
};

Yammer.prototype.dataDir = function () {
	var dataDir = process.cwd() + '/data';
	return dataDir;
}

Yammer.prototype.profileDir = function () {
	var profileDir = this.dataDir() + '/' + this._userEmail.replace(/[^a-z0-9]/gi, '_');
	return profileDir;
}

Yammer.prototype.setupDataDirs = function () {

	var dirs = [
		this.profileDir() + '/threads', 
		this.profileDir() + '/messages', 
		this.profileDir() + '/messages/sent', 
		this.profileDir() + '/oauth'
	];

	for (var i in dirs) {
		var dir = dirs[i];
		this.mkdirRecursiveSync(dir);
	}
};

Yammer.prototype.mkdirRecursiveSync = function (dir) {
	var dirTree = dir.split('/');
	var currentDir = '';

	for (var i in dirTree) {

		if (i != 0) {
			currentDir += '/';
		}
		currentDir += dirTree[i];

		if (currentDir != '' && !path.existsSync(currentDir)) {
			fs.mkdirSync(currentDir, 0755);
		}
	}
};

Yammer.prototype.messageIsUnread = function (message) {
	return !path.existsSync(this.profileDir() + '/messages/message_' + message.id() + '.json');
};

Yammer.prototype.messageIsForMe = function (message) {
	var user = this.user(this._currentUserId);

	return (
		( message.senderId() != user.id() )
		&& (
			message.isDirect() 
			|| this._threads[message.threadId()]
			|| message.parsedBody().search('[[user:' + user.id() + ']]') != -1 
			|| message.plainBody().search(user.username()) != -1 
		)
	);
};

Yammer.prototype.createThread = function (message) {
	var thread;

	if (message.threadId() && !this._threads[message.threadId()]) {
		thread = new Thread({ 
			'id' : message.threadId(), 
			'message_id' : message.id(), 
			'originator_id' : message.senderId()
		});
		this._threads[thread.id()] = thread;
		this.persistThread(thread);

	} else {
		thread = this._threads[message.threadId()];
	}

	return thread;
};

Yammer.prototype.loadThreads = function () {
	if (path.existsSync(this.profileDir() + '/threads')) {
		var files = fs.readdirSync(this.profileDir() + '/threads');
		for (var i in files) {
			var threadData = fs.readFileSync(this.profileDir() + '/threads/' + files[i], 'utf8');
			var thread = new Thread(JSON.parse(threadData));
			this._threads[thread.id()] = thread;
			this.emit('threadloaded', thread);
		}
	}
};

Yammer.prototype.persistThread = function (thread) {
	fs.writeFileSync(this.profileDir() + '/threads/thread_' + thread.id() + '.json', JSON.stringify(thread.data()));
};

Yammer.prototype.persistMessage = function (message) {
	fs.writeFileSync(this.profileDir() + '/messages/message_' + message.id() + '.json', JSON.stringify(message.data()));
};

Yammer.prototype.thread = function (threadId) {
	if (this._threads[threadId]) {
		return this._threads[threadId];
	}

	return null;
};

Yammer.prototype.threads = function () {
	return this._threads;
};

Yammer.prototype.openThreads = function () {
	var openThreads = [];

	for (var i in this._threads) {
		if (this._threads[i].property('status') == 'open') {
			openThreads.push(this._threads[i]);
		}
	}

	return openThreads;
};

Yammer.prototype.closedThreads = function () {
	var closedThreads = [];

	for (var i in this._threads) {
		if (this._threads[i].property('status') == 'closed') {
			closedThreads.push(this._threads[i]);
		}
	}

	return closedThreads;
};

// Thread ---------------------------------------------------------------

var Thread = function (data) {
	events.EventEmitter.call(this);

	this._data = data;
};

util.inherits(Thread, events.EventEmitter);

Thread.prototype.id = function () {
	return this._data.id;
};

Thread.prototype.messageId = function () {
	return this._data.message_id;
};

Thread.prototype.originatorId = function () {
	return this._data.originator_id;
};

Thread.prototype.data = function () {
	return this._data;
};

Thread.prototype.property = function (key) {
	if (this._data.properties && this._data.properties[key]) {
		return this._data.properties[key];
	}

	return null;
};

Thread.prototype.setProperty = function (key, value) {
	if (!this._data.properties) {
		this._data.properties = {};
	}

	this._data.properties[key] = value;
};

Thread.prototype.addMessage = function (message) {
	this.emit('message', message);
};

// Message --------------------------------------------------------------

var Message = function (data) {
	this._data = data;
};

Message.prototype.id = function () {
	return this._data.id;
};

Message.prototype.senderId = function () {
	return this._data.sender_id;
};

Message.prototype.threadId = function () {
	return this._data.thread_id;
};

Message.prototype.isDirect = function () {
	return this._data.direct_message;
};

Message.prototype.plainBody = function () {
	return this._data.body.plain;
};

Message.prototype.parsedBody = function () {
	return this._data.body.parsed;
};

Message.prototype.data = function () {
	return this._data;
};

// User -----------------------------------------------------------------

var User = function (data) {
	this._data = data;
};

User.prototype.id = function () {
	return this._data.id;
};

User.prototype.isAdmin = function () {
	return this._data.admin;
};

User.prototype.isActive = function () {
	return (this._data.state == 'active');
};

User.prototype.username = function () {
	return '@' + this._data.name;
};

User.prototype.fullName = function () {
	return this._data.full_name;
};

User.prototype.email = function () {
	for (var i in this._data.contact.email_addresses) {
		var email = this._data.contact.email_addresses[i];
		if (email.type == 'primary') {
			return email.address;
		}
	}

	return null;
};

User.prototype.mobilePhone = function () {
	for (var i in this._data.contact.phone_numbers) {
		var phone = this._data.contact.phone_numbers[i];
		if (phone.type == 'mobile') {
			return phone.number;
		}
	}

	return null;
};





exports.Yammer = Yammer;
exports.Thread = Thread;
exports.Message = Message;

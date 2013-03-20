"use strict";

var util = require('util');
var events = require('events');
var request = require('request');
var os = require('os');
var querystring = require('querystring');
var fs = require('fs');
var path = require('path');
var timers = require('timers');

var Thread = require('./thread').Thread;
var Message = require('./message').Message;
var User = require('./user').User;

Date.prototype.pad = function (n) {
	return (n < 10) ? '0' + n : n;
};

Date.prototype.toISODate = function () {
	return this.getFullYear() + '-'
		+ this.pad(this.getMonth() + 1) + '-'
		+ this.pad(this.getDate());
};

Date.prototype.toISODateTime = function () {
	return this.getFullYear() + '-'
		+ this.pad(this.getMonth() + 1) + '-'
		+ this.pad(this.getDate()) + 'T'
		+ this.pad(this.getHours()) + ':'
		+ this.pad(this.getMinutes()) + ':'
		+ this.pad(this.getSeconds());
};

var Yammer = function (userEmail, consumerKey, consumerSecret, authorizeCallback) {
	var tokensData, tokens;
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
		tokensData = fs.readFileSync(this.profileDir() + '/oauth/access_tokens.json', 'utf8');
		tokens = JSON.parse(tokensData);
		this._accessToken = tokens.oauth_token;
		this._accessTokenSecret = tokens.oauth_token_secret;
	}
};

util.inherits(Yammer, events.EventEmitter);

Yammer.prototype._oauthHeaders = function (token, tokenSecret, verifier) {
	var self, header;

	self = this;

	header = 'OAuth realm="", '
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
			+ 'oauth_timestamp="' + new Date().getTime() + '", '
			+ 'oauth_nonce="' + new Date().getTime() + '", ';

	if (verifier) {
		header += 'oauth_verifier="' +  verifier + '", ';
	}

	header += 'oauth_version="1.0"';

	return header;
};

Yammer.prototype._oauthRequestToken = function (requestedCallback) {
	var self = this;

	request(
		{
			'method' : 'POST',
			'uri' : self._requestTokenURI,
			'headers' : {
				'User-Agent' : self.userAgent(),
				'Content-Type' : 'application/x-www-form-urlencoded',
				'Authorization' : self._oauthHeaders(null, null, null)
			}
		},
		function (error, response, body) {
			var vars, authorizeURI;

			if (error) {
				vars = querystring.parse(body);

				self._oauthToken = vars.oauth_token;
				self._oauthTokenSecret = vars.oauth_token_secret;

				authorizeURI = self._authorizeURI + '?oauth_token=' + self._oauthToken;
				requestedCallback(authorizeURI);
			}
		}
	);
};

Yammer.prototype._oauthAuthorize = function (verifier) {
	var self = this;

	request(
		{
			'method' : 'POST',
			'uri' : self._accessTokenURI,
			'headers' : {
				'User-Agent' : self.userAgent(),
				'Content-Type' : 'application/x-www-form-urlencoded',
				'Authorization' : self._oauthHeaders(self._oauthToken, self._oauthTokenSecret, verifier)
			}
		},
		function (error, response, body) {
			var vars;

			if (!error && response.statusCode === 200) {
				vars = querystring.parse(body);

				self._accessToken = vars.oauth_token;
				self._accessTokenSecret = vars.oauth_token_secret;

				fs.writeFileSync(self.profileDir() + '/oauth/access_tokens.json', JSON.stringify(vars, null, '\t'));
				self.emit('loggedon');

			} else {
				util.puts('Authorization failed.');
				process.exit(1);
			}
		}
	);
};

Yammer.prototype.userAgent = function () {
	return this._appName + '/' + this._appVersion
	              + ' (node/' + process.version
	              + '; ' + os.type() + '/' + os.release()
	              + ')';
};

Yammer.prototype.pollMessages = function (previousMessageId) {
	var self, latestMessageId, latestMessageTime, uri;

	self = this;
	latestMessageId = 0;
	latestMessageTime = 0;

	uri = 'https://www.yammer.com/api/v1/messages.json';
	if (previousMessageId) {
		latestMessageId = previousMessageId;
		uri += '?newer_than=' + previousMessageId;
	}

	request(
		{
			'method' : 'GET',
			'uri' : uri,
			'headers' : {
				'User-Agent' : self.userAgent(),
				'Authorization' : self._oauthHeaders(self._accessToken, self._accessTokenSecret, null)
			}
		},
		function (error, response, body) {
			var data, messageTime, message, thread;

			if (!error && response.statusCode === 200) {
				data = JSON.parse(body);

				if (data.meta) {
					self._currentUserId = data.meta.current_user_id;
				}

				if (data.messages) {
					for (var i = 0; i < data.messages.length; i++) {
						messageTime = Date.parse(data.messages[i].created_at);
						if (messageTime > latestMessageTime) {
							latestMessageTime = messageTime;
							latestMessageId = data.messages[i].id;
						}

						message = new Message(data.messages[i]);
						if (self.messageIsForMe(message) && self.messageIsUnread(message)) {
							self.persistMessage(message);
							thread = self.createThread(message);
							thread.addMessage(message);
							self.emit('message', message);

						} else if (self.messageIsUnread(message)) {
							self.persistMessage(message);
							thread = self.createThread(message);
							thread.addMessage(message);
							self.emit('publicMessage', message);
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
		}
	);
};

Yammer.prototype.presences = function () {
	var self = this;

	request(
		{
			'method' : 'GET',
			'uri' : 'https://www.yammer.com/api/v1/presences.json?include_active_user_count=true&include_current_user=true&number_of_users=12&random=true',
			'headers' : {
				'User-Agent' : self.userAgent(),
				'Authorization' : self._oauthHeaders(self._accessToken, self._accessTokenSecret, null)
			}
		},
		function (error, response, body) {
			var data;

			if (!error && response.statusCode === 200) {
				data = JSON.parse(body);
//				console.log(data);

			} else {
				self.emit('error', {
					'method' : 'Yammer.presences',
					'error' : error,
					'body' : body
				});
			}
		}
	);
};

Yammer.prototype.pollPrivateMessages = function (previousMessageId) {
	var self, latestMessageId, latestMessageTime, uri;

	self = this;
	latestMessageId = 0;
	latestMessageTime = 0;
	uri = 'https://www.yammer.com/api/v1/messages/private.json';

	if (previousMessageId) {
		latestMessageId = previousMessageId;
		uri += '?newer_than=' + previousMessageId;
	}

	request(
		{
			'method' : 'GET',
			'uri' : uri,
			'headers' : {
				'User-Agent' : self.userAgent(),
				'Authorization' : self._oauthHeaders(self._accessToken, self._accessTokenSecret, null)
			}
		},
		function (error, response, body) {
			var data, message, messageTime, thread;

			if (!error && response.statusCode === 200) {
				data = JSON.parse(body);

				if (data.meta) {
					self._currentUserId = data.meta.current_user_id;
				}

				if (data.messages) {
					for (var i = 0; i < data.messages.length; i++) {
						messageTime = Date.parse(data.messages[i].created_at);
						if (messageTime > latestMessageTime) {
							latestMessageTime = messageTime;
							latestMessageId = data.messages[i].id;
						}

						message = new Message(data.messages[i]);
						if (self.messageIsForMe(message) && self.messageIsUnread(message)) {
							self.persistMessage(message);
							thread = self.createThread(message);
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
		}
	);
};

Yammer.prototype.messageLikers = function (message, callback) {
	if (!message) { return; }

	var self, uri;

	self = this;
	uri = 'https://www.yammer.com/api/v1/users/liked_message/' + message.id() + '.json';

	request(
		{
			'method' : 'GET',
			'uri' : uri,
			'headers' : {
				'User-Agent' : self.userAgent(),
				'Authorization' : self._oauthHeaders(self._accessToken, self._accessTokenSecret, null)
			}
		},
		function (error, response, body) {
			var data, users, user;

			if (!error && response.statusCode === 200) {
				data = JSON.parse(body);
				users = [];

				if (data.users) {
					for (var i = 0; i < data.users.length; i++) {
						user = self.user(data.users[i].id);
						users.push(user);
					}
				}

				if (typeof callback === 'function') { callback(users); }

			} else {
				self.emit('error', {
					'method' : 'messageLikers',
					'error' : error,
					'body' : body
				});
			}
		}
	);
};

Yammer.prototype.updateThreadMessages = function (thread, callback) {
	if (!thread) { return; }
	var self, uri;

	self = this;
	uri = 'https://www.yammer.com/api/v1/messages/in_thread/' + thread.id() + '.json';

	request(
		{
			'method' : 'GET',
			'uri' : uri,
			'headers' : {
				'User-Agent' : self.userAgent(),
				'Authorization' : self._oauthHeaders(self._accessToken, self._accessTokenSecret, null)
			}
		},
		function (error, response, body) {
			var data, message;

			if (!error && response.statusCode === 200) {
				data = JSON.parse(body);

				if (data.messages) {
					thread.clearMessages();

					for (var i = 0; i < data.messages.length; i++) {
						message = new Message(data.messages[i]);
						self.persistMessage(message);
						thread.addMessage(message, true);
					}
				}

				if (typeof callback === 'function') { callback(thread); }

			} else {
				self.emit('error', {
					'method' : 'updateThreadMessages',
					'error' : error,
					'body' : body
				});
			}
		}
	);
};

Yammer.prototype.sendMessage = function (callback, text, options) {
	var self, data;

	self = this;
	data = {};
	data.body = text;

	if (typeof options !== 'undefined') {
		if (typeof options.reply_to !== 'undefined') {
			data.replied_to_id = options.reply_to;
		}

		if (typeof options.direct_to !== 'undefined') {
			data.direct_to_id = options.direct_to;
		}
	}

	request(
		{
			'method' : 'POST',
			'uri' : 'https://www.yammer.com/api/v1/messages.json',
			'headers' : {
				'User-Agent' : self.userAgent(),
				'Authorization' : self._oauthHeaders(self._accessToken, self._accessTokenSecret, null)
			},
			'body' : querystring.stringify(data)
		},
		function (error, response, body) {
			var data, message, thread;

			if (!error && response.statusCode === 201) {
				data = JSON.parse(body);
				if (data.messages && data.messages.length > 0) {
					message = new Message(data.messages[0]);

					fs.writeFileSync(self.profileDir() + '/messages/message_' + message.id() + '.json', JSON.stringify(message.data(), null, '\t'));
					thread = self.createThread(message);
					thread.addMessage(message);

					callback(null, message);
				}

			} else {
				self.emit('error', {
					'method' : 'sendMessage',
					'error' : error,
					'body' : body
				});
			}
		}
	);
};

Yammer.prototype.loadUsers = function () {
	var self = this;

	request(
		{
			'method' : 'GET',
			'uri' : 'https://www.yammer.com/api/v1/users.json',
			'headers' : {
				'User-Agent' : self.userAgent(),
				'Authorization' : self._oauthHeaders(self._accessToken, self._accessTokenSecret, null)
			}
		},
		function (error, response, body) {
			var users, user;

			if (!error && response.statusCode === 200) {
				users = JSON.parse(body);

				if (users) {
					for (var i = 0; i < users.length; i++) {
						user = new User(users[i]);
						console.log(user.id(), user.username());
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
		}
	);
};

Yammer.prototype.userByName = function (name) {
	var users = this.users();

	for (var id in users) {
		if (users.hasOwnProperty(id)) {
			if (users[id].name() === name) { return users[id]; }
		}
	}

	return null;
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
};

Yammer.prototype.profileDir = function () {
	var profileDir = this.dataDir() + '/' + this._userEmail.replace(/[^a-z0-9]/gi, '_');
	return profileDir;
};

Yammer.prototype.setupDataDirs = function () {
	var dirs, dir;

	dirs = [
		this.profileDir() + '/threads',
		this.profileDir() + '/messages',
		this.profileDir() + '/messages/sent',
		this.profileDir() + '/oauth'
	];

	for (var i = 0; i < dirs.length; i++) {
		dir = dirs[i];
		this.mkdirRecursiveSync(dir);
	}
};

Yammer.prototype.mkdirRecursiveSync = function (dir) {
	var dirTree, currentDir;

	dirTree = dir.split('/');
	currentDir = '';

	for (var i = 0; i < dirTree.length; i++) {
		if (i !== 0) {
			currentDir += '/';
		}
		currentDir += dirTree[i];

		if (currentDir !== '' && !path.existsSync(currentDir)) {
			fs.mkdirSync(currentDir, parseInt('755', 8));
		}
	}
};

Yammer.prototype.messageIsUnread = function (message) {
	return !path.existsSync(this.profileDir() + '/messages/message_' + message.id() + '.json');
};

Yammer.prototype.messageIsForMe = function (message) {
	var user = this.user(this._currentUserId);

	return (
		(message.senderId() !== user.id())
		&&
			(
				message.isDirect()
				|| this._threads[message.threadId()]
				|| message.parsedBody().search('[[user:' + user.id() + ']]') !== -1
				|| message.plainBody().search(user.username()) !== -1
			)
	);
};

Yammer.prototype.createThread = function (message) {
	var thread;

	if (message.threadId() && !this._threads[message.threadId()]) {
		thread = new Thread({
			'id' : message.threadId(),
			'created_at' : new Date().getTime(),
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
	var files, threadData, thread;

	if (path.existsSync(this.profileDir() + '/threads')) {
		files = fs.readdirSync(this.profileDir() + '/threads');
		for (var i = 0; i < files.length; i++) {
			threadData = fs.readFileSync(this.profileDir() + '/threads/' + files[i], 'utf8');
			thread = new Thread(JSON.parse(threadData));
			this._threads[thread.id()] = thread;
			this.emit('threadloaded', thread);
		}
	}
};

Yammer.prototype.message = function (messageId) {
	var messageData, message;

	if (path.existsSync(path.join(this.profileDir(), 'messages'))) {
		if (path.existsSync(path.join(this.profileDir(), 'messages', 'message_' + messageId + '.json'))) {
			messageData = fs.readFileSync(path.join(this.profileDir(), 'messages', 'message_' + messageId + '.json'), 'utf8');
			message = new Message(JSON.parse(messageData));

			return message;
		}
	}

	return null;
};

Yammer.prototype.persistThread = function (thread) {
	fs.writeFileSync(this.profileDir() + '/threads/thread_' + thread.id() + '.json', JSON.stringify(thread.data(), null, '\t'));
};

Yammer.prototype.persistMessage = function (message) {
	fs.writeFileSync(this.profileDir() + '/messages/message_' + message.id() + '.json', JSON.stringify(message.data(), null, '\t'));
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
	var openThreads, threads;

	openThreads = [];

	for (var id in this._threads) {
		if (this._threads.hasOwnProperty(id)) {
			if (this._threads[id].property('status') === 'open') {
				openThreads.push(this._threads[id]);
			}
		}
	}

	return openThreads;
};

Yammer.prototype.closedThreads = function () {
	var closedThreads = [];

	for (var id in this._threads) {
		if (this._threads.hasOwnProperty(id)) {
			if (this._threads[id].property('status') === 'closed') {
				closedThreads.push(this._threads[id]);
			}
		}
	}

	return closedThreads;
};

exports.Yammer = Yammer;
exports.Thread = Thread;
exports.Message = Message;
exports.User = User;

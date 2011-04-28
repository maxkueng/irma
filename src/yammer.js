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
	this._users = new Array();

	this.setupDataDirs();

	if (path.existsSync(this.dataDir() + '/oauth/access_tokens.json')) {
		var tokensData = fs.readFileSync(this.dataDir() + '/oauth/access_tokens.json', 'utf8');
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
		var vars = querystring.parse(body);

		self._oauthToken = vars.oauth_token;
		self._oauthTokenSecret = vars.oauth_token_secret;

		var authorizeURI = self._authorizeURI + '?oauth_token=' + self._oauthToken;
		requestedCallback(authorizeURI);
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
		if (response.statusCode == 200) {
			var vars = querystring.parse(body);

			self._accessToken = vars.oauth_token;
			self._accessTokenSecret = vars.oauth_token_secret;

			console.log(response.statusCode);
			console.log(body);

			fs.writeFileSync(self.dataDir() + '/oauth/access_tokens.json', JSON.stringify(vars));
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
		if (response.statusCode == 200) {
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
					self.emit('message', message);
				}
			}

		} else {
			self.emit('error', { 
				'statusCode' : response.statusCode, 
				'body' : body
			});
		}

		timers.setTimeout(function () {
			self.pollMessages(latestMessageId);
		}, 30000);
	});
};

Yammer.prototype.loadUsers = function () {
	var self = this;

	var uri = 'https://www.yammer.com/api/v1/users.json';

	request({
		'method' : 'GET', 
		'uri' : uri, 
		'headers' : {
			'User-Agent' : self.userAgent(), 
			'Authorization' : self._oauthHeaders(self._accessToken, self._accessTokenSecret, null)
		}
	}, 
	function (error, response, body) {
		if (response.statusCode == 200) {
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
				'statusCode' : response.statusCode, 
				'body' : body
			});
		}
	});
};

Yammer.prototype.logon = function () {
	var self = this;

	if (self._accessToken && self._accessTokenSecret) {
		self.emit('loggedon');

	} else {
		this._oauthRequestToken(function (authorizeURI) {
			self._authorizeCallback(authorizeURI, function (verifier) {
				verifier = verifier.replace(/(\n|\r)+$/, '');
				console.log('VERIFIER: "' + verifier + "'");
				self._oauthAuthorize(verifier);
			});
		});
	}
};

Yammer.prototype.dataDir = function () {
	var dataDir = './data/' + this._userEmail.replace(/[^a-z0-9]/gi, '_');
	return dataDir;
}

Yammer.prototype.setupDataDirs = function () {

	var dirs = [
		this.dataDir() + '/threads', 
		this.dataDir() + '/messages', 
		this.dataDir() + '/oauth'
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

		if (!path.existsSync(currentDir)) {
			fs.mkdirSync(currentDir, 0755);
		}
	}
};

var Thread = function () {
	events.EventEmitter.call(this);
};

util.inherits(Thread, events.EventEmitter);

var Message = function (data) {
	this._data = data;
};

Message.prototype.id = function () {
	return this._data.id;
};

Message.prototype.plainBody = function () {
	return this._data.body.plain;
};

Message.prototype.data = function () {
	return this._data;
};

var User = function (data) {
	this._data = data;
};

User.prototype.id = function () {
	return this._data.id;
};



exports.Yammer = Yammer;
exports.Thread = Thread;
exports.Message = Message;

var util = require('util');
var events = require('events');
var request = require('request');
var os = require('os');
var querystring = require('querystring');
var fs = require('fs');
var path = require('path');

var Yammer = function (userEmail, consumerKey, consumerSecret, authorizeCallback) {
	events.EventEmitter.call(this);

	this._appName = 'AssistBot';
	this._appVersion = '0.1';

	this._userEmail = userEmail;
	this._consumerKey = consumerKey;
	this._consumerSecret = consumerSecret;
	this._serverHost = 'www.yammer.com';
	this._requestTokenURI = 'https://www.yammer.com/oauth/request_token';
	this._accessTokenURL = 'https://www.yammer.com/oauth/access_token';
	this._authorizeURL = 'https://www.yammer.com/oauth/authorize';
	this._aothorizeCallback = authorizeCallback;
	this._oauthToken = null;
	this._oauthTokenSecret = null;
	this._oauthVerifier = null;
	this._accessToken = null;
	this._accessTokenSecret = null;
	this._currentUserId = null;
	this._users = new Array();

	this.setupDataDirs();
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
//				fs.writeFileSync(self.data_dir() + '/oauth/request.tokens', response_body);

				self._oauthToken = vars.oauth_token;
				self._oauthTokenSecret = vars.oauth_token_secret;

				var authorizeURI = 'https://' + self._serverHost + self._authorizeURL + '?oauth_token=' + self._oauthToken;
				requestedCallback(authorizeURI);
	});
}

Yammer.prototype.userAgent = function () {
	return this._appName + '/' + this._appVersion
	              + ' (node/' + process.version
	              + '; ' + os.type() + '/' + os.release()
	              + ')';
};

Yammer.prototype.logon = function () {
	this._oauthRequestToken(function (authorizeURI) {
		console.log(authorizeURI);
	});
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
	var dir_tree = dir.split('/');
	var current_dir = '';

	for (var i in dir_tree) {
		if (i != 0) {
			current_dir += '/';
		}
		current_dir += dir_tree[i];

		if (!path.existsSync(current_dir)) {
			fs.mkdirSync(current_dir, 0755);
		}
	}
};

var Thread = function () {
	events.EventEmitter.call(this);
};

util.inherits(Thread, events.EventEmitter);

var Message = function () {

};

var User = function () {

};



exports.Yammer = Yammer;
exports.Thread = Thread;
exports.Message = Message;

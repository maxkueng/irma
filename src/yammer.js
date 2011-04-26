var util = require('util');
var events = require('events');
var request = require('request');
var os = require('os');

var Yammer = function (userEmail, consumerKey, consumerSecret, authorizeCallback) {
	events.EventEmitter.call(this);

	this._appName = 'AssistBot';
	this._appVersion = '0.1';

	this._userEmail = userEmail;
	this._consumerKey = consumerKey;
	this._consumerSecret = consumerSecret;
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
		console.log(body);
	});
}

Yammer.prototype.userAgent = function () {
	return this._appName + '/' + this._appVersion
	              + ' (node/' + process.version
	              + '; ' + os.type() + '/' + os.release()
	              + ')';
};

Yammer.prototype.logon = function () {
	this._oauthRequestToken();
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

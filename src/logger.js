var sys = require('sys');

var _prefix = function(){ return ''; };

var setPrefix = function (callback) {
	_prefix = callback;
}

var log = function (message) {
	sys.puts(_prefix() + '>>> ' + message);
};

var info = function (message) {
	sys.puts(_prefix() + '[info] ' + message);
};

var warn = function (message) {
	sys.puts(_prefix() + '[warn] ' + message);
};

var error = function (message) {
	sys.puts(_prefix() + '[error] ' + message);
};


exports.setPrefix = setPrefix;
exports.log = log;
exports.info = info;
exports.warn = warn;
exports.error = error;

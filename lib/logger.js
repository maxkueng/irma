var util = require('util');

var _prefix = function(){ return ''; };

var setPrefix = function (callback) {
	_prefix = callback;
}

var log = function (message) {
	util.puts(_prefix() + '>>> ' + message);
};

var info = function (message) {
	util.puts(_prefix() + '[info] ' + message);
};

var warn = function (message) {
	util.puts(_prefix() + '[warn] ' + message);
};

var error = function (message) {
	util.puts(_prefix() + '[error] ' + message);
};


exports.setPrefix = setPrefix;
exports.log = log;
exports.info = info;
exports.warn = warn;
exports.error = error;

var fs = require('fs');
var path = require('path');
var Yammer = require('./yammer').Yammer;

var cwd = process.cwd();
var config = load_config();
var yammer_account = config.yammer[config.yammer_account];

var y = new Yammer(yammer_account.email, yammer_account.api.consumer_key, yammer_account.api.consumer_secret);
console.log(y.userAgent());
y.logon();


//
function load_config () {
	if (path.existsSync(cwd + '/config.json')) {
		var config_data = fs.readFileSync(cwd + '/config.json', 'utf8');
		return JSON.parse(config_data);
	}

	sys.puts('Error: Configuration file not found');
	process.exit(1);
}

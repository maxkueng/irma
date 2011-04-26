var Yammer = require('./yammer').Yammer;

var y = new Yammer();
console.log(y.userAgent());
y.logon();

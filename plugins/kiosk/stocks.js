var path = require('path');
var fs = require('fs');
var stocks = {};

var get = function (itemId) {
	if (!stocks[itemId]) {
		stocks[itemId] = new Stock(itemId);
	}

	return stocks[itemId];
};

var Stock = function (itemId) {
	this._itemId = itemId;
	this._stockFile = path.join(exports.dataDir, 'stock-' + itemId + '.json');
	this._updates = null;
	this._load();
};

Stock.prototype._load = function () {
	if (this._updates) return;

	if (path.existsSync(this._stockFile)) {
		var data = fs.readFileSync(this._stockFile, 'UTF-8');
		this._updates = JSON.parse(data);
		return;
	}

	this._updates = [];
};

Stock.prototype._persist = function (path, callback) {
	if (typeof callback === 'undefined') {
		callback = path;
		path = null;
	}

	if (!path) path = this._stockFile;

	var data = JSON.stringify(this._updates);

	fs.writeFile(path, data, function (err) {
		if (err) throw err;
		callback();
	});
};

Stock.prototype.itemId = function () {
	return this._itemId;		
};

Stock.prototype.update = function (dataset, callback) {
	dataset.time = new Date();
	this._updates.push(dataset);
	this._persist(function () {
		if (typeof callback == 'function') callback();
	});
};

Stock.prototype.updateByBookingId = function (bookingId) {
	for (var i = 0; i < this._updates.length; i++) {
		var update = this._updates[i];
		if (update.bookingId == bookingId) return update;
	}

	return null;
};

Stock.prototype.stock = function () {
	var stock = 0;
	for (var i = 0; i < this._updates.length; i++) {
		stock += this._updates[i].change;
	}

	return stock;
};

exports.dataDir = null;
exports.get = get;
exports.Stock = Stock;

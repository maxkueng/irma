require('datejs');
var items = require('./items');
var Item = items.Item;
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
	dataset.time = Date.now();
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

Stock.prototype.info = function () {
	var updates = this._updates;
	var total = 0;
	var weeks = [];
	for (var i = 0; i < updates.length; i++) {
		var update = updates[i];
		if (update.type != 'consumption' && update.type != 'reverse') continue;

		var week = new Date(update.time).toString('yyyy-') + new Date(update.time).getISOWeek();
		if (weeks.indexOf(week) == -1) weeks.push(week);

		if (update.type == 'consumption') total++;
		if (update.type == 'reverse') total--;
	}

	var stock = this.stock();
	var item = items.get(this._itemId);
	var avgRations = total / weeks.length;
	var avgUnits = avgRations * item.ration();
	var percent = 100 / (avgUnits * 3) * stock;
	var health = 'perfect';
	if (percent < 100) health = 'good';
	if (percent < 50) health = 'critical';
	if (percent < 30) health = 'bad';

	return {
		'stock' : stock, 
		'avgRations' : avgRations, 
		'avgUnits' : avgUnits, 
		'percent' : percent, 
		'health' : health
	};
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

"use strict";

var path = require('path');
var fs = require('fs');

var itemIds = [];
var items = {};

var load = function () {
	var filePath, data, itemFilePath, itemData, item;

	filePath = path.join(exports.dataDir, 'items.json');

	if (path.existsSync(filePath)) {
		data = fs.readFileSync(filePath, 'UTF-8');
		itemIds = JSON.parse(data);

	} else {
		itemIds = [];
	}

	for (var i = 0; i < itemIds.length; i++) {
		itemFilePath = path.join(exports.dataDir, 'item-' + itemIds[i] + '.json');
		if (path.existsSync(itemFilePath)) {
			itemData = JSON.parse(fs.readFileSync(itemFilePath, 'UTF-8'));
			item = new Item(itemData);
			items[item.id()] = item;
		}
	}
};

var persist = function () {
	var filePath, data, itemFilePath, itemData, item;

	filePath = path.join(exports.dataDir, 'items.json');
	data = JSON.stringify(itemIds, null, '\t');
	fs.writeFileSync(filePath, data);

	for (var i = 0; i < itemIds.length; i++) {
		item = items[itemIds[i]];

		if (item) {
			itemFilePath = path.join(exports.dataDir, 'item-' + itemIds[i] + '.json');
			fs.writeFileSync(itemFile, JSON.parse(item.data(), null, '\t'));
		}
	}
};

var get = function (id) {
	if (items[id]) { return items[id]; }
	return null;
};

var all = function () {
	return items;
};

var Item = function (data) {
	this._data = {
		'item' : {},
		'changes' : {}
	};

	if (typeof data.item !== 'undefined' && data.changes !== 'undefined') { 
		this._data = data;
		return;
	}

	this._data.item = data;
};

Item.prototype.data = function () { return this._data; };
Item.prototype.id = function () { return this._data.item.id; };
Item.prototype.name = function () { return this._data.item.name; };
Item.prototype.description = function () { return this._data.item.description; };
Item.prototype.price = function () { return this._data.item.price; };
Item.prototype.displayPrice = function () { return this._data.item.displayPrice; };
Item.prototype.unit = function () { return this._data.item.unit; };
Item.prototype.ration = function () { return this._data.item.ration; };
Item.prototype.isBuyable = function () { return (this._data.item.buyable === true); };
Item.prototype.isStockable = function () { return (this._data.item.stockable === true); };

Item.prototype.changes = function () {
	if (typeof this._data.changes === 'undefined') { return []; }
	return this._data.changes;
};

exports.dataDir = null;
exports.Item = Item;
exports.load = load;
exports.persist = persist;
exports.get = get;
exports.all = all;

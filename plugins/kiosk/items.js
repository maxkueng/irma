"use strict";

require('datejs');
var path = require('path');
var fs = require('fs');
var revjsion = require('revjsion');
var uuid = require('node-uuid');

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
			fs.writeFileSync(itemFilePath, JSON.stringify(item.data(), null, '\t'));
		}
	}
};

var get = function (id) {
	if (items[id]) { return items[id]; }
	return null;
};

var create = function () {
	var item = new Item({
		'item' : {
			'id' : uuid.v1().substr(0, 12).replace('-', '0')
		},
		'changes' : []
	});

	itemIds.push(item.id());
	items[item.id()] = item;

	return item;
};

var remove = function (id) {
	var idx = itemIds.indexOf(id);
	itemIds.splice(idx, 1);

	delete items[id];
};

var all = function () {
	return items;
};

var Item = function (data) {
	if (typeof data !== 'undefined') {
		this.setData(data);
		return;
	}

	this._data = {
		'item' : {},
		'changes' : []
	};
};

Item.prototype.id = function () {
	if (typeof this._data.item.id === 'undefined') { return String(); }
	return this._data.item.id;
};

Item.prototype.name = function () { 
	if (typeof this._data.item.name === 'undefined') { return String(); }
	return this._data.item.name; 
};

Item.prototype.description = function () { 
	if (typeof this._data.item.description === 'undefined') { return String(); }
	return this._data.item.description;
};

Item.prototype.price = function () {
	if (typeof this._data.item.price === 'undefined') { return Number(); }
	return this._data.item.price;
};

Item.prototype.displayPrice = function () {
	if (typeof this._data.item.displayPrice === 'undefined') { return String(); }
	return this._data.item.displayPrice;
};

Item.prototype.unit = function () {
	if (typeof this._data.item.unit === 'undefined') { return String(); }
	return this._data.item.unit;
};

Item.prototype.ration = function () {
	if (typeof this._data.item.ration === 'undefined') { return Number(); }
	return this._data.item.ration;
};

Item.prototype.isBuyable = function () {
	return (this._data.item.buyable === true);
};

Item.prototype.isStockable = function () {
	return (this._data.item.stockable === true);
};

Item.prototype.data = function () { return this._data; };
Item.prototype.itemData = function () { return this._data.item; };

Item.prototype.setData = function (data) {
	if (typeof data.item !== 'undefined' && data.changes !== 'undefined') { 
		this._data = data;
		return;
	}

	this._data.item = data;
};

Item.prototype.updateData = function (data) {
	this.saveDiff(this.itemData(), data);
	this.setData(data);
};

Item.prototype.saveDiff = function (originalData, newData) {
	var diff, changes, update, change, field;

	if (typeof this._data.changes === 'undefined') this._data.changes = [];

	diff = new revjsion.Diff(originalData, newData);
	changes = diff.getChanges();

	if (changes.length === 0) { return; }

	update = {
		'time' : Date.now(), 
		'changes' : []
	};

	for (var i = 0; i < changes.length; i++) {
		field = changes[i].path.replace('/', '');

		change = {
			'field' : field,
			'originalValue' : originalData[field],
			'newValue' : changes[i].value
		};

		update.changes.push(change);
	}

	this._data.changes.push(update);
};

Item.prototype.changes = function () {
	if (typeof this._data.changes === 'undefined') { return []; }
	return this._data.changes;
};

exports.dataDir = null;
exports.Item = Item;
exports.load = load;
exports.persist = persist;
exports.get = get;
exports.create = create;
exports.remove = remove;
exports.all = all;

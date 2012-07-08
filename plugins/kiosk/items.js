"use strict";

var items = {};

var get = function (id) {
	if (items[id]) { return items[id]; }
	return null;
};

var add = function (item) {
	items[item.id()] = item;
};

var all = function () {
	return items;
};

var Item = function (data) {
	this._data = data;
};

Item.prototype.id = function () { return this._data.id; };
Item.prototype.name = function () { return this._data.name; };
Item.prototype.description = function () { return this._data.description; };
Item.prototype.price = function () { return this._data.price; };
Item.prototype.displayPrice = function () { return this._data.displayPrice; };
Item.prototype.unit = function () { return this._data.unit; };
Item.prototype.ration = function () { return this._data.ration; };
Item.prototype.isBuyable = function () { return (this._data.buyable === true); };
Item.prototype.isStockable = function () { return (this._data.stockable === true); };

exports.Item = Item;
exports.get = get;
exports.add = add;
exports.all = all;

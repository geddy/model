var BaseAdapter
  , EventEmitter = require('events').EventEmitter
  , adapter = require('./index')
  , utils = require('utilities');

BaseAdapter = function () {
};

BaseAdapter.prototype = new EventEmitter();
utils.mixin(BaseAdapter.prototype, new (function () {

  this.load = function (query, callback) {};

  this.update = function (data, query, callback) {};

  this.remove = function (query, callback) {};

  this.insert = function (data, opts, callback) {};

  this.createTable = function (names, callback) {};

})());

module.exports.BaseAdapter = BaseAdapter;

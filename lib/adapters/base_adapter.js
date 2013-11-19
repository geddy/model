var BaseAdapter
  , EventEmitter = require('events').EventEmitter
  , model = require('../index')
  , adapter = require('./index')
  , utils = require('utilities');

BaseAdapter = function () {
};

BaseAdapter.prototype = new EventEmitter();
utils.mixin(BaseAdapter.prototype, new (function () {

  this.connect = function (callback) {
    var self = this
      , cb = callback || function () {};
    setTimeout(function () {
      self.emit('connect');
      cb();
    }, 0);
  };

  this.disconnect = function (callback) {
    var self = this
      , cb = callback || function () {};
    setTimeout(function () {
      self.emit('disconnect');
      cb();
    }, 0);
  };

  this.load = function (query, callback) {
    callback(null, []);
  };

  this.update = function (data, query, callback) {
    if (data instanceof model.ModelBase) {
      callback(null, data);
    }
    else {
      callback(null, true);
    }
  };

  this.remove = function (query, callback) {
    callback(null, true);
  };

  this.insert = function (data, opts, callback) {
    data.id = utils.string.uuid()
    data._saved = true;
    callback(null, data);
  };

  this.count = function (query, callback) {
    callback(null, 0);
  };

  this.createTable = function (names, callback) {
    callback(null, null);
  };

  this.dropTable = function (names, callback) {
    callback(null, null);
  };

})());

module.exports.BaseAdapter = BaseAdapter;

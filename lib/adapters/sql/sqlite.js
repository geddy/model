var file = require('utilities').file
  , sqlite = file.requireLocal('node-sqlite')
  , generator = require('../../../lib/generators/sql')
  , utils = require('utilities')
  , model = require('../../../lib')
  , Query = require('../../../lib/query/query').Query
  , BaseAdapter = require('./base').Adapter
  , Adapter
  , _baseConfig;

_baseConfig = {
  database: process.env.USER
};

Adapter = function (options) {
  var opts = options || {}
    , config;

  this.name = 'sqlite';
  this.config = _baseConfig;
  this.client = null;

  utils.mixin(this.config, opts);

  this.init.apply(this, arguments);
};

Adapter.prototype = new BaseAdapter();
Adapter.prototype.constructor = Adapter;

utils.mixin(Adapter.prototype, new (function () {

  this.init = function () {
    this.client = sqlite.openDatabaseSync(this.config.database);
  };

  this.connect = function () {};

  this.disconnect = function () {};

  this.exec = function (query, callback) {
    this.client.query(query, callback);
  };

  this.load = function (query, callback) {
  };

  this.update = function (data, query, callback) {
  };

  this.remove = function (query, callback) {
  };

  this.insert = function (data, opts, callback) {
  };


  this.createTable = function (names, callback) {
  };

})());

module.exports.Adapter = Adapter;


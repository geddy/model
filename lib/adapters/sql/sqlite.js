var file = require('utilities').file
  , sqlite3 = file.requireLocal('sqlite3')
  , generator = require('../../../lib/generators/sql')
  , utils = require('utilities')
  , model = require('../../../lib')
  , Query = require('../../../lib/query/query').Query
  , BaseAdapter = require('./base').Adapter
  , Adapter
  , _baseConfig;

_baseConfig = {
  database: process.env.USER + '.db'
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
    this.client = new sqlite3.Database(this.config.database);
  };

  this.connect = function () {
    this.emit('connect');
  };

  this.disconnect = function () {
    this.emit('disconnect');
  };

  this.exec = function (query, callback) {
    console.log(query);
    this.client.all(query, callback);
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
    console.log('create');
    var sql = generator.createTable(names);
    this.exec(sql, callback);
  };

  this.dropTable = function (names, callback) {
    var sql = generator.dropTable(names);
    this.exec(sql, callback);
  };
})());

module.exports.Adapter = Adapter;


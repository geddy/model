var utils = require('utilities')
  , sqlite3
  , EventEmitter = require('events').EventEmitter
  , generator = require('../../../lib/generators/sql')
  , model = require('../../../lib')
  , Query = require('../../../lib/query/query').Query
  , BaseAdapter = require('./base').Adapter
  , Adapter
  , _baseConfig;

// DB lib should be locally installed in the consuming app
sqlite3 = utils.file.requireLocal('sqlite3', model.localRequireError);

_baseConfig = {
  database: process.env.USER + '.db'
};

Adapter = function (options) {
  var opts = options || {}
    , config;

  this.name = 'sqlite';
  this.type = 'sql';
  this.config = this.loadConfig(_baseConfig, opts);
  this.client = null;
  this.generator = generator.getGeneratorForAdapter(this);

  this.init.apply(this, arguments);
};

Adapter.prototype = new BaseAdapter();
Adapter.prototype.constructor = Adapter;

utils.mixin(Adapter.prototype, new (function () {

  this.TRUE_VALUE = 1;
  this.FALSE_VALUE = 0;
  this.FETCH_METHOD = 'all';

  this.init = function () {
    this.client = new sqlite3.Database(this.config.database);
  };

  this.connect = function (callback) {
    var self = this
      , cb = callback || function () {};
    // Set the stupid pragma, then we're ready to go
    this.exec('PRAGMA case_sensitive_like = ON;', function (err, data) {
      if (err) {
        self.emit('error', err);
        cb(err);
      }
      else {
        self.emit('connect');
        cb();
      }
    });
  };

  // this.disconnect
  // Just inherit the base `disconnect` method

  this.exec = function (query, callback) {
    if (model.log) {
      model.log(query);
    }
    this.client.exec(query, callback);
  };

  // SQLite makes you choose between a single callback (`all`) and
  // per-row callback (`each`). This wrapper method makes it behave
  // like Postgres/MySQL, where it takes a single final callback,
  // and emits an event per-row
  this.all = function (query, callback) {
    var rows = []
      , emitter = new EventEmitter();
    if (model.log) {
      model.log(query);
    }
    this.client.each(query, function (err, row) {
      if (err) {
        if (typeof callback == 'function') {
          return callback(err, null);
        }
        emitter.emit('error', err);
      }
      emitter.emit('row', row);
      if (typeof callback == 'function') {
        rows.push(row);
      }
    }, function (err, count) {
      if (err) {
        rows = null;
        emitter.emit('error', err);
      }
      else {
        emitter.emit('end');
      }
      if (typeof callback == 'function') {
        callback(err, rows);
      }
    });
    return emitter;
  };

  this.update = function (data, query, callback) {
    var sql = this._createUpdateStatementWithConditions(data, query);
    this.exec(sql, function (err, res) {
      if (err) {
        callback(err, null);
      }
      else {
        if (data instanceof model.ModelBase) {
          callback(null, data);
        }
        else {
          callback(null, true);
        }
      }
    });
  };

  this.remove = function (query, callback) {
    var sql = this._createDeleteStatementWithConditions(query);
    this.exec(sql, function (err, data) {
      if (err) {
        callback(err, null);
      }
      else {
        callback(null, true);
      }
    });
  };

  this.insert = function (data, opts, callback) {
    var self = this
      , items = Array.isArray(data) ? data : [data]
      , modelName = items[0].type
      , ctor = model[modelName]
      , reg = model.descriptionRegistry
      , props = reg[modelName].properties
      , sql = '';

   items.forEach(function (item) {
      var statement = self._createInsertStatement(item, props);
      sql += statement;
    });

    this.exec(sql, function (err, res) {
      var item;
      if (err) {
        callback(err, null);
      }
      else {
        for (var i = 0, ii = items.length; i < ii; i++) {
          item = items[i];
          item._saved = true;
        }
        if (data instanceof model.ModelBase) {
          callback(null, data);
        }
        else {
          callback(null, true);
        }
      }
    });
  };

  this.createTable = function (names, callback) {
    var sql = this.generator.createTable(names);
    this.exec(sql, callback);
  };

  this.dropTable = function (names, callback) {
    var sql = this.generator.dropTable(names);
    this.exec(sql, callback);
  };
})());

module.exports.Adapter = Adapter;


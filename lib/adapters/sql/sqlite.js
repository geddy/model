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
sqlite3 = utils.file.requireLocal('sqlite3');

_baseConfig = {
  database: process.env.USER + '.db'
};

Adapter = function (options) {
  var opts = options || {}
    , config;

  this.name = 'sqlite';
  this.type = 'sql';
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
    var self = this;
    // Set the stupid pragma, then we're ready to go
    this.exec('PRAGMA case_sensitive_like = ON;', function () {
      self.emit('connect');
    }, 0);
  };

  this.disconnect = function () {
    var self = this;
    setTimeout(function () {
      self.emit('disconnect');
    }, 0);
  };

  this.exec = function (query, callback) {
    this.client.exec(query, callback);
  };

  // SQLite makes you choose between a single callback (`all`) and
  // per-row callback (`each`). This wrapper method makes it behave
  // like Postgres/MySQL, where it takes a single final callback,
  // and emits an event per-row
  this.all = function (query, callback) {
    var rows = []
      , emitter = new EventEmitter();
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
      emitter.emit('end');
      if (typeof callback == 'function') {
        callback(null, rows);
      }
    });
    return emitter;
  };

  this.load = function (query, callback) {
    var self = this
      , sql = ''
      , cb
      , processor;

    // Package up SQL-specific data in the query object
    query._sqlMetadata = this._getSqlMetadata(query);

    sql = this._createSelectStatementWithConditions(query);

    if (query.opts.count) {
      this.all(sql, function (err, data) {
        if (err) {
          callback(err, null);
        }
        else {
          callback(null, data[0]['COUNT(*)']);
        }
      });
    }
    else {
      if (callback || query.opts.limit == 1) {
        cb = function (err, res) {
          // If explicitly limited to one, just return the single instance
          // This is also used by the `first` method
          if (res && query.opts.limit == 1) {
            res = res[0];
          }
          callback(null, res);
        };
      }
      processor = new BaseAdapter.EventedItemProcessor(query, cb);
      setTimeout(function () {
        processor.process(self.all(sql));
      }, 0);
      return processor;
    }
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
    var sql = generator.createTable(names);
    this.exec(sql, callback);
  };

  this.dropTable = function (names, callback) {
    var sql = generator.dropTable(names);
    this.exec(sql, callback);
  };
})());

module.exports.Adapter = Adapter;


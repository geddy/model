var utils = require('utilities')
  , mysql
  , generator = require('../../../lib/generators/sql')
  , model = require('../../../lib')
  , Query = require('../../../lib/query/query').Query
  , BaseAdapter = require('./base').Adapter
  , Adapter
  , _baseConfig;

// DB lib should be locally installed in the consuming app
mysql = utils.file.requireLocal('mysql', model.localRequireError);

_baseConfig = {
  host: 'localhost'
, user: process.env.USER
, password: null
, database: process.env.USER
};

Adapter = function (options) {
  var opts = options || {}
    , config;

  this.name = 'mysql';
  this.type = 'sql';
  this.config = _baseConfig;
  this.client = null;
  this.generator = generator.getGeneratorForAdapter(this);

  utils.mixin(this.config, opts);

  this.init.apply(this, arguments);
};

Adapter.prototype = new BaseAdapter();
Adapter.prototype.constructor = Adapter;

utils.mixin(Adapter.prototype, new (function () {

  this.COLUMN_NAME_DELIMITER = '`';

  this.init = function () {
    this.client = mysql.createConnection(this.config);
  };

  this.connect = function (callback) {
    var self = this
      , cb = callback || function () {};
    this.client.connect(function (err, data) {
      if (err) {
        self.emit('error', err);
        cb(err);
      }
      else {
        self.exec('USE ' + self.config.database, function (err, data) {
          if (err) {
            self.emit('error', err);
            cb(err);
          }
          else {
            self.emit('connect');
            cb();
          }
        });
      }
    });
  };

  this.disconnect = function (callback) {
    var self = this
      , cb = callback || function () {};
    this.client.end(function (err, data) {
      if (err) {
        self.emit('error', err);
        cb(err);
      }
      else {
        self.emit('disconnect');
        cb();
      }
    });
  };

  this.exec = function (query, callback) {
    if (model.log) {
      model.log(query);
    }
    return this.client.query(query, callback);
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
      this.exec(sql, function (err, data) {
        if (err) {
          callback(err, null);
        }
        else {
          callback(null, data[0]['COUNT(*)']);
        }
      });
    }
    else {
      if (callback) {
        cb = function (err, res) {
          // If explicitly limited to one, just return the single instance
          // This is also used by the `first` method
          if (res && query.opts.limit == 1) {
            res = res[0];
          }
          callback(null, res);
        };
      }
      processor = new BaseAdapter.EventedQueryProcessor(query, cb);
      setTimeout(function () {
        processor.process(self.exec(sql));
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
    var sql = this.generator.createTable(names);
    this.exec(sql, callback);
  };

  this.dropTable = function (names, callback) {
    var sql = this.generator.dropTable(names);
    this.exec(sql, callback);
  };
})());

module.exports.Adapter = Adapter;



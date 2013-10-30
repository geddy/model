var utils = require('utilities')
  , mysql
  , generator = require('../../../lib/generators/sql')
  , model = require('../../../lib')
  , Query = require('../../../lib/query/query').Query
  , BaseAdapter = require('./base').Adapter
  , Adapter
  , _baseConfig;

// DB lib should be locally installed in the consuming app
mysql = utils.file.requireLocal('mysql');

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

  this.connect = function () {
    var self = this;
    this.client.connect(function () {
      self.exec('USE ' + self.config.database, function (err, data) {
        if (err) {
          throw err;
        }
        self.emit('connect');
      });
    });
  };

  this.disconnect = function () {
    var self = this;
    this.client.end(function () {
      self.emit('disconnect');
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
      , tableName = this._tableizeModelName(query.model.modelName)
      , includes = this._getIncludes(query)
      , selects = this._getSelectCols(query, tableName, includes);

    sql = this._createSelectStatementWithConditions(query, selects, tableName, includes);

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
      var itemProcessor =
          this._createItemProcessor(selects, tableName, query, function (err, res) {
        if (err) {
          callback(err, null);
        }
        else {
          // If explicitly limited to one, just return the single instance
          // This is also used by the `first` method
          if (res && query.opts.limit == 1) {
            res = res[0];
          }
          callback(null, res);
        }
      });

      this.exec(sql, function (err, data) {
        itemProcessor(err, data);
      });
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



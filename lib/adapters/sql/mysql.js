var utils = require('utilities')
  , mysql
  , generator = require('../../../lib/generators/sql')
  , model = require('../../../lib')
  , BaseAdapter = require('./base').Adapter
  , RECONNECT_TRIES_LIMIT = 3
  , reconnectAttempts = 0
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
  var opts = options || {};

  this.name = 'mysql';
  this.type = 'sql';
  this.config = this.loadConfig(_baseConfig, opts);
  this.client = null;
  this.generator = generator.getGeneratorForAdapter(this);

  this.init.apply(this, arguments);
};

Adapter.prototype = new BaseAdapter();
Adapter.prototype.constructor = Adapter;

utils.mixin(Adapter.prototype, new (function () {

  this.COLUMN_NAME_DELIMITER = '`';

  // Pseudo-private -- utility and for testing only
  this._getClient = function () {
    return mysql.createConnection(this.config);
  };

  this._handleError = function(err) {
    var self = this;
    if (err.code === 'PROTOCOL_CONNECTION_LOST' &&
      reconnectAttempts < RECONNECT_TRIES_LIMIT) {
      self._handleDisconnect();
    }
  }

  this._handleDisconnect = function (callback) {
      var self = this;
      setTimeout(function() {
        self.client = self._getClient();
        self.client.on('error', function(err) {
            self._handleError(err);
        });
        self.connect(callback);
      }, Math.pow(3, reconnectAttempts) * 1000);
      reconnectAttempts++;
  };

  this.init = function () {
    var self = this;
    this.client = this._getClient();
    this.client.on('error', function(err) {
      self._handleError(err);
    });
  };

  this.connect = function (callback) {
    var self = this
      , cb = callback || function () {};
    this.client.connect(function (err, data) {
      if (err) {
        if (reconnectAttempts < RECONNECT_TRIES_LIMIT) {
          self._handleDisconnect(callback);
        } else {
          self.emit('error', err);
          cb(err);
        }
      }
      else {
        reconnectAttempts = 0;
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



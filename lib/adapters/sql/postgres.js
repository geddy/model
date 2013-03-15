var file = require('utilities').file
  , pg = require('pg')
  , generator = require('../../generators/sql')
  , utils = require('utilities')
  , model = require('../../index')
  , Query = require('../../query/query').Query
  , BaseAdapter = require('./base').Adapter
  , Adapter
  , _baseConfig;

_baseConfig = {
  user: process.env.USER
, database: process.env.USER
, password: null
, host: null
, port: 5432
};

Adapter = function (options) {
  var opts = options || {}
    , config;

  this.name = 'postgres';
  this.config = _baseConfig;
  this.client = null;

  utils.mixin(this.config, opts);

  this.init.apply(this, arguments);
};

Adapter.prototype = new BaseAdapter();
Adapter.prototype.constructor = Adapter;

utils.mixin(Adapter.prototype, new (function () {

 var _itemsWithSQL = function (sql, model, callback) {
        this.exec(sql, function (err, data) {
          var res
            , rows;
          if (err) {
            callback(err, null);
          }
          else {
            rows = data.rows;
            res = [];
            rows.forEach(function (row) {
              var inst = model.create(row);
              inst.id = row.id;
              inst._saved = true;
              res.push(inst);
            });
            callback(null, res);
          }
        });
      };

  this.init = function () {
    this.client = new pg.Client(this.config);
  };

  this.connect = function () {
    var self = this;
    this.client.connect(function (err, data) {
      if (err) {
        throw err;
      }
      else {
        self.emit('connect');
      }
    });
  };

  this.disconnect = function () {
    this.client.end();
    this.emit('disconnect');
  };

  this.exec = function (query, callback) {
    this.client.query(query, callback);
  };

  this.load = function (query, callback) {
    var sql = ''
      , conditions = this.transformConditions(query.conditions)
      , opts = query.opts
      , sort = opts.sort
      , limit = opts.limit
      , skip = opts.skip;

    sql += 'SELECT * FROM ' + this._tableizeModelName(query.model.modelName);
    sql += ' ';
    if (conditions) {
      sql += 'WHERE ' + conditions;
    }
    if (sort) {
      sql += this.transformSortOrder(sort);
    }
    if (skip) {
      sql += ' OFFSET ' + skip;
    }
    if (limit) {
      sql += ' LIMIT ' + limit;
    }
    sql += ';'

    _itemsWithSQL.apply(this, [sql, query.model, function (err, res) {
      // If explicitly limited to one, just return the single instance
      // This is also used by the `first` method
      if (query.opts.limit == 1) {
        res = res[0];
      }
      callback(null, res);
    }]);

  };

  this.bySQL = function (query, model, callback) {
    var name = this._tableizeModelName(model.modelName)
      , sql = 'SELECT ' + name + '.* FROM ' + name;
    sql += ' ' + query;
    _itemsWithSQL.apply(this, [sql, model, callback]);
  };

  this.update = function (data, query, callback) {
    var modelName = data.type
      , reg = model.descriptionRegistry
      , props = reg[modelName].properties
      , prop
      , def
      , datatypes = model.datatypes
      , sql = ''
      , updates = []
      , update;

    // Iterate over the properties in the params, make sure each
    // property exists in the definition
    for (var p in data) {
      def = props[p];
      prop = data[p];
      if (props.hasOwnProperty(p)) {
        update = this._columnizePropertyName(p, {
          useQuotes: true
        }) +
        ' = ';

        update += this.transformValue(prop, def.datatype);

        updates.push(update);
      }
    }
    sql += 'UPDATE ' + this._tableizeModelName(modelName) + ' SET ';
    sql += updates.join(', ') + ' ';
    sql += 'WHERE ' + this.transformConditions(query.conditions);
    sql += ';'

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
    var sql = '';
    sql += 'DELETE FROM ' + this._tableizeModelName(query.model.modelName) + ' ';
    sql += 'WHERE ' + this.transformConditions(query.conditions);
    sql += ';'
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
      var statement = self._createInsertStatement(item, props, ctor.autoIncrementId);
      statement = statement.replace(/;$/, ' RETURNING id;');
      sql += statement;
    });

    this.exec(sql, function (err, res) {
      var item
        , rows;
      if (err) {
        callback(err, null);
      }
      else {
        rows = res.rows;
        for (var i = 0, ii = items.length; i < ii; i++) {
          item = items[i];
          item.id = rows[i].id; // Set the id from the row
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

})());

module.exports.Adapter = Adapter;

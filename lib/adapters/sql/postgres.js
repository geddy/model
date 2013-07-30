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

 var _itemsWithSQL = function (sql, tables, mainTable, query, callback) {
        var self = this;
        this.exec(sql, function (err, data) {
          var res
            , rows
            , inst
            , models = {}
            , mainIds = {};

          if (err) {
            callback(err, null);
          }
          else {
            // Make a map of the constructors for each table-name
            // Note that the table-name may be an alias for an association
            // First item in this list should be the owner table for
            // any subsequent associations, e.g., ['users', 'profiles']
            tables.forEach(function (t) {
              models[t] = {
                ctor: self._modelizeTableName(t, mainTable)
              , assnType: t == mainTable ? null : model.getAssociation(mainTable, t).type
              }
            });

            rows = data.rows;
            res = [];

            rows.forEach(function (row) {
              var obj = {}
                , colArr
                , table
                , key;

              // Create a column object with mapped params
              // users#login: 'foo', users#name: 'adsf', profiles#nickname: 'qwer'
              //{ users: {login: 'foo', name: 'asdf'}
              //, profile: {nickname: 'qewr'}
              //}
              for (var p in row) {
                colArr = p.split('#');
                table = colArr[0];
                key = colArr[1];
                obj[table] = obj[table] || {}
                obj[table][key] = row[p];
              }

              // Iterate over the list of table names, create a base owner object
              // when a new id shows up. (Owner object record is repeated for multiple
              // associations.) For each subsquent record, instantiate the association
              // and append it to an array in the named property for that association
              tables.forEach(function (p) {
                var params = obj[p]
                  , modelItem = models[p];
                // Owner table-name
                if (p == mainTable) {
                  if (mainIds.hasOwnProperty(params.id)) {
                    inst = mainIds[params.id];
                  } else {
                    // This is a new id -- create an owner object
                    inst = modelItem.ctor.create(params, {scenario: query.opts.scenario});
                    inst._saved = true;
                    res.push(inst);
                    mainIds[params.id] = inst;
                  }
                }
                // Association table-name
                else {
                  // Ignore empty records
                  if (params.id) {
                    // Create an array to hold the items if necessary
                    if (modelItem.assnType == 'hasMany') {
                      inst[p] = inst[p] || [];
                      inst[p].push(modelItem.ctor.create(params, {scenario: query.opts.scenario}));
                    }
                    else {
                      inst[utils.string.getInflection(p, 'property', 'singular')] =
                          modelItem.ctor.create(params, {scenario: query.opts.scenario});
                    }
                  }
                }
              });
            });
            callback(null, res);
          }
        });
      };

  this.init = function () {
    this.client = new pg.Client(this.config);
  };

  this.connect = function (cb) {
    var self = this
      , callback = cb || function () {};
    this.client.connect(function (err, data) {
      if (err) {
        throw err;
      }
      else {
        self.emit('connect');
        callback(data);
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
    var self = this
      , sql = ''
      , conditions = this.transformConditions(query.conditions)
      , tableName = this._tableizeModelName(query.model.modelName)
      , selects
      , includesTableName
      , includesColName
      , opts = query.opts
      , includes = opts.includes
      , sort = opts.sort
      , limit = opts.limit
      , skip = opts.skip;

    selects = [tableName];
    if (includes) {
      includes = Array.isArray(includes) ? includes : [includes];
      includes = includes.map(function (t) {
        return self._tableizeModelName(t);
      });
      selects = selects.concat(includes);
    }

    sql += 'SELECT ';
    sql += selects.map(function (item) {
      return self._createSelectStatement(item, tableName);
    }).join(', ');
    sql += ' ';
    sql += 'FROM ' + tableName;
    if (includes) {
      sql += ' ' + includes.map(function (item) {
        return self._createLeftOuterJoinStatement(tableName, item);
      }).join(' ');
    }
    if (conditions) {
      sql += ' ';
      sql += 'WHERE ' + conditions;
    }
    if (sort) {
      sql += ' ';
      sql += this.transformSortOrder(sort, tableName);
    }
    if (skip) {
      sql += ' ';
      sql += 'OFFSET ' + skip;
    }
    if (limit) {
      sql += ' ';
      sql += 'LIMIT ' + limit;
    }
    sql += ';'

    _itemsWithSQL.apply(this, [sql, selects, tableName, query, function (err, res) {
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
    }]);

  };

  this.bySQL = function (query, model, callback) {
    var name = this._tableizeModelName(model.modelName)
      , sql = 'SELECT ' + name + '.* FROM ' + name;
    sql += ' ' + query;
    _itemsWithSQL.apply(this, [sql, [name], name, query, callback]);
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
      var statement = self._createInsertStatement(item, props);
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

  this.dropTable = function (names, callback) {
    var sql = generator.dropTable(names);
    this.exec(sql, callback);
  };

})());

module.exports.Adapter = Adapter;

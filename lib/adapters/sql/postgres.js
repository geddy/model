
var pg = require('pg')
  , generator = require('../../../lib/generators/sql')
  , utils = require('utilities')
  , model = require('../../../lib')
  , Query = require('../../../lib/query/query').Query
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
      , conditions = this._serializeConditions(query.conditions)
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
      sql += this._serializeSortOrder(sort);
    }
    if (skip) {
      sql += ' OFFSET ' + skip;
    }
    if (limit) {
      sql += ' LIMIT ' + limit;
    }
    sql += ';'
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
          var inst = query.model.create(row);
          inst.id = row.id;
          inst._saved = true;
          res.push(inst);
        });
        // If explicitly limited to one, just return the single instance
        // This is also used by the `first` method
        if (query.opts.limit == 1) {
          res = res[0];
        }
        callback(null, res);
      }
    });
  };

  this.update = function (data, query, opts, callback) {
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

        update += this._serializeValue(prop, def.datatype);

        updates.push(update);
      }
    }
    sql += 'UPDATE ' + this._tableizeModelName(modelName) + ' SET ';
    sql += updates.join(', ') + ' ';
    sql += 'WHERE ' + this._serializeConditions(query.conditions);
    sql += ';'

    this.exec(sql, function (err, res) {
      if (err) {
        callback(err, null);
      }
      else {
        // FIXME: What is the right data to return here? SQL updates
        // can affect lots of rows, and I don't think we want to limit
        // it to single-item updates
        callback(null, true);
      }
    });
  };

  this.remove = function (query, opts, callback) {
    var sql = '';
    sql += 'DELETE FROM ' + this._tableizeModelName(query.model.modelName) + ' ';
    sql += 'WHERE ' + this._serializeConditions(query.conditions);
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
      , prop
      , def
      , datatypes = model.datatypes
      , sql = '';

   items.forEach(function (item) {
      var cols = []
        , vals = [];

      // If using string UUID ids
      if (!ctor.autoIncrementId) {
        item.id = utils.string.uuid();
        cols.push(self._columnizePropertyName('id'));
        vals.push(datatypes.string.serialize(item.id, {
          escape: true
        , useQuotes: true
        }));
      }
      else {
        cols.push(self._columnizePropertyName('id'));
        vals.push('DEFAULT');
      }

      for (var p in props) {
        def = props[p];
        prop = item[p];
        // Use the same definition of NULL as for updates
        prop = self._serializeValue(prop, def.datatype);
        if (prop != 'NULL') {
          cols.push(self._columnizePropertyName(p, {
            useQuotes: true
          }));
          vals.push(prop);
        }
      }
      sql += 'INSERT INTO ' + self._tableizeModelName(modelName) + ' ';
      sql += '(' + cols.join(', ') + ')';
      sql += ' VALUES ';
      sql += '(' + vals.join(', ') + ')';
      sql += ' RETURNING id'
      sql += ';\n';
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
          item.id = rows[i].id;
          item._saved = true;
        }
        callback(null, items.length == 1 ? items[0] : items);
      }
    });
  };


  this.createTable = function (names, callback) {
    var sql = generator.createTable(names);
    this.exec(sql, callback);
  };

})());

module.exports.Adapter = Adapter;

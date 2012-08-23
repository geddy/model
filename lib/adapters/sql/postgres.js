
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
, port: 5432
, host: null
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

  var _insert = function (data, callback) {
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
      }

    , _update = function (data, query, callback) {
        var modelName = data.type
          , reg = model.descriptionRegistry
          , props = reg[modelName].properties
          , prop
          , def
          , datatypes = model.datatypes
          , sql = ''
          , updates = []
          , update;

        // Bail out if instance isn't valid
        if (!data.isValid()) {
          return callback(data.errors, null);
        }

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
            data._saved = true;
            callback(null, data);
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

  this.all = function (query, callback) {
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
        // `load` method
        if (query.opts.limit == 1) {
          res = res[0];
        }
        callback(null, res);
      }
    });
  };

  this.update = function (data, query, callback) {
    _update.apply(this, arguments);
  };

  this.remove = function (query, callback) {
    var sql = '';
    sql += 'DELETE FROM ' + this._tableizeModelName(query.model.modelName) + ' ';
    sql += 'WHERE ' + this._serializeConditions(query.conditions);
    sql += ';'
    this.exec(sql, function (err, data) {
      if (err) {
        callback(err, null);
      }
      else {
        callback(null, data);
      }
    });
  };

  this.save = function (data, opts, callback) {
    var saved
      , item;

    // Bulk save only works on new items -- existing item should only
    // be when doing instance.save
    if (Array.isArray(data)) {
      saved = false;
      for (var i = 0, ii = data.length; i < ii; i++) {
        item = data[i];
        if (item._saved) {
          return callback(new Error('A bulk-save can only have new ' +
              'items in it.'), null);
        }
        // Bail out if instance isn't valid
        if (!item.isValid()) {
          return callback(item.errors, null);
        }
      }
    }
    else {
      saved = data._saved;
      // Bail out if instance isn't valid
      if (!data.isValid()) {
        return callback(data.errors, null);
      }
    }

    // Existing instance, create dummy Query object and do update
    if (saved) {
      query = new Query(model[data.type], {id: data.id}, {});
      _update.apply(this, [data, query, callback]);
    }
    // New instance(s), insert
    else {
      _insert.apply(this, [data, callback]);
    }
  };


  this.createTable = function (names, callback) {
    var sql = generator.createTable(names);
    this.exec(sql, callback);
  };

})());

module.exports.Adapter = Adapter;

var utils = require('utilities')
  , pg
  , generator = require('../../../lib/generators/sql')
  , model = require('../../index')
  , Query = require('../../query/query').Query
  , BaseAdapter = require('./base').Adapter
  , Adapter
  , _baseConfig;

// DB lib should be locally installed in the consuming app
pg = utils.file.requireLocal('pg', model.localRequireError);

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
  this.type = 'sql';
  this.config = this.loadConfig(_baseConfig, opts);
  this.client = null;
  this.generator = generator.getGeneratorForAdapter(this);

  this.init.apply(this, arguments);
};

Adapter.prototype = new BaseAdapter();
Adapter.prototype.constructor = Adapter;

utils.mixin(Adapter.prototype, new (function () {

  this.init = function () {
    this.client = new pg.Client(this.config);
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
        self.emit('connect');
        cb();
      }
    });
  };

  this.disconnect = function (callback) {
    var self = this
      , cb = callback || function () {};

    this.client.once('end', function () {
      self.emit('disconnect');
      cb();
    });

    this.client.end();
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
      , processor
      , innerProcessor;

    if (query.opts.count) {
      query._sqlMetadata = this._getSqlMetadata(query);
      sql = this._createSelectStatementWithConditions(query);
      this.exec(sql, function (err, data) {
        if (err) {
          callback(err, null);
        }
        else {
          callback(null, data.rows[0].count);
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

      // JOINs don't work with limit/offset, have to do an initial query to
      // grab a list of ids to do the includes query with
      if (query.opts.includes && (query.opts.limit || query.opts.offset)) {

        // Save includes, then strip off current query obj
        var includes = query.opts.includes;
        delete query.opts.includes;
        // Generate the SQL and metadata
        query._sqlMetadata = this._getSqlMetadata(query);
        sql = this._createSelectStatementWithConditions(query);

        // Generate the actual EQP which will be returned
        processor = new BaseAdapter.EventedQueryProcessor(query);

        // Do an initial query to get the list of ids that match
        innerProcessor = new BaseAdapter.EventedQueryProcessor(query, function (err, res) {
          var ids;
          if (err) {
            cb(err, null);
          }
          // Grab the list of ids
          ids = res.map(function (item) {
            return item.id;
          });
          // Strip the limit/offset opts
          delete query.opts.limit;
          delete query.opts.offset;

          // Put back the includes
          query.opts.includes = includes;
          // Create a new query without the filter and with the simple list of ids
          query = new Query(query.model, {id: ids}, query.opts);

          // Create SQL and metadata again
          query._sqlMetadata = self._getSqlMetadata(query);
          sql = self._createSelectStatementWithConditions(query);

          // Attach the new query and callback
          processor.query = query;
          processor.callback = cb;

          processor.process(self.exec(sql));
        });
        innerProcessor.process(self.exec(sql));
        return processor;
      }
      else {
        query._sqlMetadata = this._getSqlMetadata(query);
        sql = this._createSelectStatementWithConditions(query);
        processor = new BaseAdapter.EventedQueryProcessor(query, cb);
        setTimeout(function () {
          processor.process(self.exec(sql));
        }, 0);
        return processor;
      }
    }

  };

  this.bySQL = function (query, model, callback) {
    var name = this._tableizeModelName(model.modelName)
      , sql = 'SELECT ' + name + '.* FROM ' + name;
    sql += ' ' + query;
    this._itemsWithSQL.apply(sql, [name], name, query, callback);
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
    var sql = this.generator.createTable(names);
    this.exec(sql, callback);
  };

  this.dropTable = function (names, callback) {
    var sql = this.generator.dropTable(names);
    this.exec(sql, callback);
  };

})());

module.exports.Adapter = Adapter;

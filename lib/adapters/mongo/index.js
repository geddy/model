var file = require('utilities').file
  , driver = file.requireLocal('mongodb-wrapper')
  , utils = require('utilities')
  , operation = require('../../query/operation')
  , comparison = require('../../query/comparison')
  , datatypes = require('../../datatypes')
  , request = utils.request
  , BaseAdapter = require('../base_adapter').BaseAdapter
  , _baseConfig
  , _collectionizeModelName;

_baseConfig = {
  username: null
, dbname: null
, prefix: null
, password: null
, host: 'localhost'
, port: 27017
};

_collectionizeModelName = function (name) {
  var collectionName = utils.inflection.pluralize(name);
  collectionName = utils.string.snakeize(collectionName);
  return collectionName;
};

var Adapter = function (options) {
  var opts = options || {}
    , config;

  this.name = 'mongo';
  this.config = _baseConfig;
  this.client = null;

  utils.mixin(this.config, opts);

  this.init.apply(this, arguments);
};

Adapter.prototype = new BaseAdapter();
Adapter.prototype.constructor = Adapter;

utils.mixin(Adapter.prototype, new (function () {

  this._serializeSortOrder = function (sort) {
  };

  this._serializeConditions = function (conditions) {
  };

  this._serializeOperation = function (op) {
  };

  this.init = function () {
    var config = this.config
      , args = [];
    ['host', 'port', 'dbname', 'prefix', 'username',
        'password'].forEach(function (c) {
      args.push(config[c]);
    });
    this.client = driver.db.apply(driver, args);
  };

  this.exec = function (options, callback) {
  };

  this.load = function (query, callback) {
    var collectionName = _collectionizeModelName(query.model.modelName)
      , collection = this.client.collection(collectionName)
      , id = query.byId
      , conditions
      , sort;

    // Single instance-lookup by id
    if (id) {
      collection.findOne({id: id}, function (err, data) {
        var inst
          , res = [];
        if (err) {
          // Not found?
          //if (err.statusCode == 404) {
          //  callback(null, null);
          //}
          //else {
            callback(err, null);
          //}
        }
        else {
          inst = query.model.create(data);
          inst.id = id;
          inst._saved = true;
          res.push(inst);
          // If explicitly limited to one, just return the single instance
          // This is also used by the `first` method
          if (query.opts.limit == 1) {
            res = res[0];
          }
          callback(null, res);
        }
      });
    }
    // Teh mapreducy
    else {
      /*
      conditions = this._serializeConditions(query.conditions);
      sort = this._serializeSortOrder(query.opts.sort);
      requestOpts = {
          url: '/mapred'
        , method: 'POST'
        , data: _mapReduceQuery(bucket, conditions, sort)
      };
      this.request(requestOpts, function (err, data) {
        var rows
          , res = [];
        if (err) {
          callback(err, null);
        }
        else {
          rows = data;
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
      */
    }
  };


  this.update = function (data, query, opts, callback) {
  };

  this.remove = function (query, opts, callback) {
  };

  this.insert = function (data, opts, callback) {
    var self = this
      , items = Array.isArray(data) ? data.slice() : [data]
      , collectionName = _collectionizeModelName(items[0].type)
      , collection = this.client.collection(collectionName)
      , ret = []
      , insert;

    insert = function () {
      var item;
      if ((item = items.shift())) {
        var id = utils.string.uuid()

        item.id = id;
        item = item.toData({whitelist: ['id', 'createdAt']});

        collection.save(item, function (err, res) {
          if (err) {
            callback(err, null);
          }
          else {
            item.id = id;
            item._saved = true;
            ret.push(data);
            insert();
          }
        });
      }
      else {
        callback(null, ret);
      }
    };
    insert();
  };

  this.createTable = function (names, callback) {
    var self = this
      , collections = Array.isArray(names) ? names.slice() : [names]
      , create = function () {
          var c;
          if ((c = collections.shift())) {
            self.client.createCollection(c, {}, create);
          }
          else {
            callback();
          }
        };
    create();
  };

})());

module.exports.Adapter = Adapter;


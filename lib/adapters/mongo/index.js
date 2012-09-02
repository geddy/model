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
          if (data) {
            inst = query.model.create(data);
            inst.id = id;
            inst._id = data._id;
            inst._saved = true;
            res.push(inst);
          }
          // If explicitly limited to one, just return the single instance
          // This is also used by the `first` method
          if (query.opts.limit == 1) {
            res = res[0];
          }
          callback(null, res);
        }
      });
    }
    // Collection
    else {
      conditions = this._serializeConditions(query.rawConditions);
      sort = this._serializeSortOrder(query.opts.sort);
      /*
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
    var collectionName = _collectionizeModelName(query.model.modelName)
      , collection = this.client.collection(collectionName)
      , id = query.byId
      , requestOpts
      , item = data;
    // Single instance-lookup by id
    if (id) {
      // Bail out if instance isn't valid
      if (!item.isValid()) {
        return callback(data.errors, null);
      }

      item = item.toData({whitelist: ['_id', 'id', 'createdAt']});

      collection.update({id: id}, item, function (err, data) {
        if (err) {
          callback(err, null);
        }
        else {
          // FIXME: What is the right data to return here? Right now this
          // is basically overwriting a doc, but we might be supporting
          // bulk-updates at some point
          callback(null, true);
        }
      });
    }
    // Bulk update?
    else {
      callback(new Error('Bulk update is not supported'), null);
    }
  };

  this.remove = function (query, opts, callback) {
    var collectionName = _collectionizeModelName(query.model.modelName)
      , collection = this.client.collection(collectionName)
      , id = query.byId
      , requestOpts;

    // Single instance-lookup by id
    if (id) {
      collection.remove({id: id}, function (err, data) {
        var inst
          , res = [];
        if (err) {
          callback(err, null);
        }
        else {
          callback(null, true);
        }
      });
    }
    // Collection
    else {
      callback(new Error('Bulk remove is not supported'), null);
    }
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

        collection.insert(item, function (err, res) {
          if (err) {
            callback(err, null);
          }
          else {
            item.id = id;
            item._id = res._id;
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


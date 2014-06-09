var model = require('../../index')
  , mongo
  , utils = require('utilities')
  , operation = require('../../query/operation')
  , comparison = require('../../query/comparison')
  , Query = require('../../query/query').Query
  , datatypes = require('../../datatypes')
  , request = utils.request
  , BaseAdapter = require('../base_adapter').BaseAdapter
  , _baseConfig
  , _comparisonTypeMap
  , _collectionizeModelName;

// DB lib should be locally installed in the consuming app
mongo = utils.file.requireLocal('mongodb', model.localRequireError)

_baseConfig = {
  username: null
, dbname: null
, prefix: null
, password: null
, host: 'localhost'
, port: 27017
};

_comparisonTypeMap = {
  'NotEqualTo': '$ne'
, 'Inclusion': '$in'
, 'GreaterThan': '$gt'
, 'LessThan': '$lt'
, 'GreaterThanOrEqual': '$gte'
, 'LessThanOrEqual': '$lte'
};

_collectionizeModelName = function (name) {
  var collectionName = utils.inflection.pluralize(name);
  collectionName = utils.string.snakeize(collectionName);
  return collectionName;
};

_generateConnectionUrl = function (config) {
  var connectionString = 'mongodb://';
  if (config.username) {
    connectionString += config.username;
    if (config.password) {
      connectionString += ':' + config.password;
    }
    connectionString += '@';
  }
  connectionString += config.host;
  if (config.port) {
    connectionString += ':' + config.port;
  }
  if (config.dbname) {
    connectionString += '/' + config.dbname;
  }
  return connectionString;
};

var Adapter = function (options) {
  var opts = options || {}
    , config;

  this.name = 'mongo';
  this.config = this.loadConfig(_baseConfig, opts);
  this.client = null;

  this.init.apply(this, arguments);
};

Adapter.prototype = new BaseAdapter();
Adapter.prototype.constructor = Adapter;

utils.mixin(Adapter.prototype, new (function () {

  this.transformSortOrder = function (sort) {
    var ret = {};
    if (sort) {
      for (var p in sort) {
        ret[p] = (sort[p] == 'asc') ? 1 : -1;
      }
    }
    return ret;
  };

  this.transformConditions = function (conditions) {
    return this.transformOperation(conditions);
  };

  this.transformOperation = function (op) {
    var self = this
      , ops = []
      , ret = {};
    if (!op.isEmpty()) {
      if (op.type == 'not') {
        ret = {'$nor': [self.transformOperation(op.operand())]};
      }
      else {
        // 'and' or 'or', ignore 'null' for now
        ret['$' + op.type] = ops;
        op.forEach(function (o) {
          if (o instanceof operation.OperationBase) {
            ops.push(self.transformOperation(o));
          }
          else {
            ops.push(self.transformComparison(o));
          }
        });
      }
    }
    return ret;
  };

  this.transformComparison = function (comp) {
    var ret = {}
      , nocase = comp.opts.nocase
      , complex
      , re
      , startsWithWildcard
      , endsWithWildcard
      , val = comp.value
      , tempVal = [];

    switch (true) {
      case comp instanceof comparison.EqualToComparison:
        // Case-insensitive equality via regex
        if (nocase) {
          val = val.toLowerCase();
          val = utils.string.escapeRegExpChars(val);
          re = new RegExp('^' + val + '$', 'i');
          ret[comp.field] = re;
        }
        else {
          ret[comp.field] = val;
        }
        break;
      // Convert to regex
      case comp instanceof comparison.LikeComparison:

        if( !(val instanceof RegExp) ) {
          startsWithWildcard = val.charAt(0) == '%';
          endsWithWildcard = val.charAt(val.length - 1) == '%';

          val = val.split('%');

          // Replace all percents that aren't endcaps with .*,
          // everything else with escaped strings
          for(var i in val) {
            if(val[i] != '') {
              tempVal.push(utils.string.escapeRegExpChars(val[i]));
            }
          }

          val = tempVal.join('.*');

          // Tack on anchors if needed
          if(startsWithWildcard && !endsWithWildcard) {
            val = val + '$';
          }

          if(!startsWithWildcard) {
            val = '^' + val;
          }

          if (nocase) {
            val = val.toLowerCase();
            re = new RegExp(val, 'i');
          }
          else {
            re = new RegExp(val);
          }
        }
        else {
          re = val;

          //Check if inconsistent with the nocase option
          if( (re.ignoreCase && !nocase) || (!re.ignoreCase && nocase) ) {
            throw new Error('RegExp ignoreCase inconsistent with nocase option');
          }
        }

        ret[comp.field] = re;
        break;
      default:
        complex = {};
        complex[_comparisonTypeMap[comp.type]] = val;
        ret[comp.field] = complex;
    }
    return ret;
  };

  this.init = function () {
    var config = this.config
      , server = new mongo.Server(config.host, config.port);
    this.client = new mongo.MongoClient(server, config);
  };

  this.connect = function (callback) {
    var self = this
      , cb = callback || function () {};
    this.client.connect(_generateConnectionUrl(self.config), function (err, db) {
      if (err) {
        self.emit('error', err);
        cb(err);
      }
      else {
        self.client._db = db;
        self.emit('connect');
        cb();
      }
    });
  };

  this.disconnect = function (callback) {
    var self = this
      , cb = callback || function () {};
    this.client.close(function (err, data) {
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

  this.load = function (query, callback) {
    var collectionName = _collectionizeModelName(query.model.modelName)
      , collection = this.client._db.collection(collectionName)
      , id = query.byId
      , result
      , conditions
      , sort
      , limit
      , skip;

    // Single instance-lookup by id
    if (id) {
      collection.findOne({id: id}, function (err, data) {
        var inst
          , res = [];
        if (err) {
          callback(err, null);
        }
        else {
          if (data) {
            inst = query.model.create(data, {scenario: query.opts.scenario});
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
      conditions = this.transformConditions(query.conditions);
      sort = this.transformSortOrder(query.opts.sort);
      skip = query.opts.skip;
      limit = query.opts.limit;

      result = collection.find(conditions, {});
      result = result.sort(sort);
      if (skip) {
        result = result.skip(skip);
      }
      if (limit) {
        result = result.limit(limit);
      }
      if (query.opts.count) {
        result.count(function (err, data) {
          if (err) {
            callback(err, null);
          }
          else {
            callback(null, data);
          }
        });
      }
      else {
        result.toArray(function (err, data) {
          var rows
            , res = [];
          if (err) {
            callback(err, null);
          }
          else {
            rows = data;
            rows.forEach(function (row) {
              var inst = query.model.create(row, {scenario: query.opts.scenario});
              inst.id = row.id;
              inst._id = row._id;
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
      }
    }
  };

  this.update = function (data, query, callback) {
    var collectionName = _collectionizeModelName(query.model.modelName)
      , collection = this.client._db.collection(collectionName)
      , id = query.byId
      , item = data;
    // Single instance-lookup by id
    if (id) {
      item = item.toJSON({whitelist: ['_id']});

      collection.update({id: id}, item, function (err, res) {
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
    }
    // Bulk update?
    else {
      callback(new Error('Bulk update is not supported'), null);
    }
  };

  this.remove = function (query, callback) {
    var collectionName = _collectionizeModelName(query.model.modelName)
      , collection = this.client._db.collection(collectionName)
      , id = query.byId
      , conditions;

    // Single instance-lookup by id
    if (id) {
      conditions = {id: id};
    }
    // Collection
    else {
      conditions = this.transformConditions(query.conditions);
    }
    collection.remove(conditions, function (err, data) {
      var inst
        , res = [];
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
      , items = Array.isArray(data) ? data.slice() : [data]
      , collectionName = _collectionizeModelName(items[0].type)
      , collection = this.client._db.collection(collectionName)
      , insert
      , id;

    insert = function () {
      var item;
      if ((item = items.shift())) {
        id = item.id || utils.string.uuid();
        item.id = id;
        item = item.toJSON();
        // Use our id as Mongo's _id, ensure that it's unique in collection
        item._id = id;

        collection.insert(item, function (err, res) {
          if (err) {
            callback(err, null);
          }
          else {
            insert();
          }
        });
      }
      else {
        if (data instanceof model.ModelBase) {
          data.id = id; // Single instance, can use last id generated above
          data._saved = true;
          callback(null, data);
        }
        else {
          callback(null, true);
        }
      }
    };
    insert();
  };

  this.createTable = function (names, callback) {
    var self = this
      , collections = Array.isArray(names) ? names.slice() : [names]
      , create = function () {
          var c
            , tableName;
          if ((c = collections.shift())) {
            tableName = utils.inflection.pluralize(c);
            tableName = utils.string.snakeize(tableName);
            self.client._db.createCollection(c, {}, create);
          }
          else {
            callback();
          }
        };
    create();
  };

  this.dropTable = function (names, callback) {
    var self = this
      , collections = Array.isArray(names) ? names.slice() : [names]
      , drop = function () {
          var c
            , tableName
            , collection;
          if ((c = collections.shift())) {
            tableName = utils.inflection.pluralize(c);
            tableName = utils.string.snakeize(tableName);
            collection = self.client._db.collection(tableName);
            collection.drop(drop);
          }
          else {
            callback();
          }
        };
    drop();
  };

})());

module.exports.Adapter = Adapter;


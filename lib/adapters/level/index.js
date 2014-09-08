var model = require('../../index')
  , utils = require('utilities')
  , level
  , multilevel
  , net
  , mr = require('../transformers/mr')
  , operation = require('../../query/operation')
  , comparison = require('../../query/comparison')
  , datatypes = require('../../datatypes')
  , request = utils.request
  , BaseAdapter = require('../base_adapter').BaseAdapter
  , _baseConfig
  , _data = {}
  , delimiter = '!';

// DB lib should be locally installed in the consuming app
try {
  // First try the Level convenience lib
  level = utils.file.requireLocal('level');
} catch(e) {}

try {
  // Next, try LevelUp
  level = utils.file.requireLocal('levelup');
} catch(e) {}

try {
  // Finally, multilevel
  multilevel = utils.file.requireLocal('multilevel');
  net = require('net');
} catch(e) {}

if (!level && !multilevel) {
  throw new Error(model.localRequireError);
}

_baseConfig = {
  db: '/data/level',
  sublevel: '',
  keyPrefix: true,
  multilevel: {
    port: 3000,
    host: 'localhost',
    manifest: '',
    auth: false
  }
};

var Adapter = function (options) {
  var opts = options || {}
    , config;

  this.name = 'level';
  this.config = this.loadConfig(_baseConfig, opts);
  this.client = null;
  this.db = null;

  this.init.apply(this, arguments);
};

Adapter.prototype = new BaseAdapter();
Adapter.prototype.constructor = Adapter;

utils.mixin(Adapter.prototype, new (function () {

  this._initLevel = function (config) {
    var db
      , sublevel;

    db = level(config.db, {keyEncoding: 'utf8', valueEncoding: 'json'});

    if (config.sublevel) {
      // Load sublevel, and set db
      sublevel = utils.file.requireLocal('level-sublevel');
      db = sublevel(db);
      db = db.sublevel(config.sublevel);
    }

    this.db = db;
  };

  this._initMultilevel = function (config) {
    var db
      , con
      , manifest;

    if (config.multilevel.manifest) {
      manifest = require(config.multilevel.manifest);
    }

    db = multilevel.client(manifest);

    this.client = net.connect(config.multilevel.port, config.multilevel.host, function (err) {
      if (err) throw err;
    });

    if (config.multilevel.auth) {
      db.auth(config.multilevel.auth, function (err) {
        if (err) throw err;
      });
    }

    this.client.pipe(db.createRpcStream()).pipe(this.client);

    if (config.sublevel) {
      this.db = db.sublevel(config.sublevel);
    } else {
      this.db = db;
    }
  };

  this._generateKey = function (type, id) {
    var keyPrefix = this.config.keyPrefix;

    if (keyPrefix === true) {
      return type + delimiter + id;

    }
    else if (keyPrefix === false) {
      return id;
    }
    else {
      return keyPrefix + delimiter + id;
    }
  }

  this.init = function () {
    var config = this.config;

    if (multilevel) {
      this._initMultilevel(config);
    } else {
      this._initLevel(config);
    }
  };

  this.load = function (query, callback) {
    var type = query.model.modelName
      , key
      , props = model.descriptionRegistry[type].properties
      , datatype
      , id = query.byId
      , conditions
      , sort
      , limit = query.opts.limit
      , skip = query.opts.skip || 0
      , items
      , item
      , data
      , val
      , filter
      , res = []
      , db = this.db
      , startKey
      , endKey;

    if (id) {
      key = this._generateKey(type, id);
      db.get(key, function (err, item) {
        if (err && err.notFound) {
          // handle a 'NotFoundError' here
          if(limit == 1)
            return callback(null, undefined);
          else
            return callback(null, []);
        }
        if (err) {
          return callback(err);
        }

        inst = query.model.create(item, {scenario: query.opts.scenario});
        inst.id = id;
        inst._saved = true;

        if (limit == 1) {
          callback(null, inst);
        }
        else {
          callback(null, [inst]);
        }
      })
    }
    else {
      conditions = this.transformConditions(query.conditions);
      sort = this.transformSortOrder(query.opts.sort);

      filter = new Function('data', 'return (' + conditions + ')');

      startKey = this._generateKey(type, '');
      endKey = this._generateKey(type, '\xFF');

      db.createReadStream({start: startKey, end: endKey})
        .on('data', function (item) {
          data = item.value;

          if (filter(data)) {
            inst = query.model.create(item.value, {scenario: query.opts.scenario});
            inst.id = item.value.id;
            inst._saved = true;
            res.push(inst);
          }
        })
        .on('error', function (err) {
          if (err && err.notFound) {
            return callback(null, undefined);
          }
          callback(err, null);
        })
        .on('end', function () {
          if (sort) {
            sort(res);
          }

          if (limit) {
            if (skip === 0 && limit === 1) {
              res = res[0];
            }
            else {
              res = res.slice(skip, skip + limit);
            }
          }

          if (query.opts.count) {
            res = res.length;
          }

          callback(null, res);
        });
    }
  };

  this.update = function (data, query, callback) {
    var type = query.model.modelName
      , key
      , id = query.byId
      , ids
      , item = data
      , db = this.db;

    if (id) {
      item = item.toJSON();
      key = this._generateKey(type, id);
      db.put(key, item, function (err) {
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
      })
    }
    else {
      callback(new Error('Bulk update is not supported'), null);
    }
  };

  this.remove = function (query, callback) {
    var type = query.model.modelName
      , self = this
      , key
      , id = query.byId
      , db = this.db
      , ids
      , remove;

    if (id) {
      key = this._generateKey(type, id);
      db.del(key, function (err) {
        if (err) {
          callback(err, null);
        }
        else {
          callback(null, true);
        }
      });
    }
    // Remove via query
    else {
      remove = function () {
        var id;
        if ((id = ids.shift())) {
          key = self._generateKey(type, id);
          db.del(key, function (err) {
            if (err) {
              callback(err, null);
            }
            else {
              remove();
            }
          });
        }
        else {
          callback(null, true);
        }
      };
      // We have a list of ids
      if (Array.isArray(query.rawConditions.id)) {
        // Make a copy; going to be pulling shit off to iterate
        ids = query.rawConditions.id.slice();
        remove();
      }
      // Do a fetch to get the matching items -- this is like, anti-optimal
      else {
        ids = [];
        this.load(query, function (err, items) {
          if (err) {
            callback(err, null);
          }
          else {
            items.forEach(function (item) {
              ids.push(item.id);
            });
            remove();
          }
        });
      }
    }
  };

  this.insert = function (data, opts, callback) {
    var items = Array.isArray(data) ? data.slice() : [data]
      , self = this
      , type = items[0].type
      , db = this.db
      , id
      , insert;

    insert = function () {
      var item;

      if ((item = items.shift())) {
        id = item.id || utils.string.uuid();

        item.id = id;
        item = item.toJSON();

        key = self._generateKey(type, id);
        db.put(key, item, function (err) {
          if (err) {
            return callback(err, null);
          }
          else {
            insert();
          }
        })
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
    callback(null, true);
  };

  this.dropTable = function (names, callback) {
    var types = Array.isArray(names) ? names.slice() : [names]
      , db = this.db
      , startKey
      , endKey
      , self = this;

    var drop = function () {
      var type
        , tableName;
      if ((type = types.shift())) {
        // tableName = utils.inflection.pluralize(c);
        // tableName = utils.string.snakeize(tableName);
        startKey = self._generateKey(type, '');
        endKey = self._generateKey(type, '\xFF');

        db.createReadStream({start: startKey, end: endKey})
          .pipe(db.createWriteStream({ type: 'del' }))
          .on('close', function () {
            drop();
          });
      }
      else {
        callback(null, true);
      }
    }
    drop();
  };

  this.connect = function (callback) {
    var self = this
      , cb = callback || function () {};
    this.client.on('connect', function (err) {
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
    this.client.on('close', function (err) {
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

})());

utils.mixin(Adapter.prototype, mr);

module.exports.Adapter = Adapter;


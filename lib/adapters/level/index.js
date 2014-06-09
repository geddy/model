var model = require('../../index')
  , utils = require('utilities')
  , level
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
level = utils.file.requireLocal('level', model.localRequireError);

_baseConfig = {
  db: '/data/level'
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

  this.init = function () {
    var config = this.config;
    this.db = level(config.db, {keyEncoding: 'utf8', valueEncoding: 'json'});
  };

  this.load = function (query, callback) {
    var key = query.model.modelName
      , props = model.descriptionRegistry[key].properties
      , datatype
      , id = query.byId
      , conditions
      , sort
      , limit = query.opts.limit
      , items
      , item
      , data
      , val
      , filter
      , res = []
      , db = this.db;

    if (id) {
      db.get(key + delimiter + id, function (err, item) {
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

      db.createReadStream({start: key + delimiter, end: key + delimiter + '\xFF'})
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
            if (limit == 1) {
              res = res[0];
            }
            else {
              res = res.slice(0, limit);
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
    var key = query.model.modelName
      , id = query.byId
      , ids
      , item = data
      , db = this.db;

    if (id) {
      item = item.toJSON();
      db.put(key + delimiter + id, item, function (err) {
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
    var key = query.model.modelName
      , id = query.byId
      , db = this.db
      , ids
      , remove;

    if (id) {
      db.del(key + delimiter + id, function (err) {
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
          db.del(key + delimiter + id, function (err) {
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
      , key = items[0].type
      , db = this.db
      , id
      , insert;

    insert = function () {
      var item;

      if ((item = items.shift())) {
        id = item.id || utils.string.uuid();

        item.id = id;
        item = item.toJSON();

        db.put(key + delimiter + id, item, function (err) {
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
    var keys = Array.isArray(names) ? names.slice() : [names]
      , db = this.db;

    var drop = function () {
      var key
        , tableName;
      if ((key = keys.shift())) {
        // tableName = utils.inflection.pluralize(c);
        // tableName = utils.string.snakeize(tableName);
        db.createReadStream({start: key + delimiter, end: key + delimiter + '\xFF'})
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

})());

utils.mixin(Adapter.prototype, mr);

module.exports.Adapter = Adapter;


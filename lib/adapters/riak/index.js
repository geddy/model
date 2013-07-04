var model = require('../../index')
  , utils = require('utilities')
  , mr = require('../transformers/mr')
  , request = utils.request
  , BaseAdapter = require('../base_adapter').BaseAdapter
  , _baseConfig
  , _reduceFunction
  , _mapReduceQuery
  , _bucketizeModelName;

_baseConfig = {
  protocol: 'http'
, host: 'localhost'
, port: 8098
};

var Adapter = function (options) {
  var opts = options || {}
    , config;

  this.name = 'riak';
  this.config = _baseConfig;
  this.client = null;

  utils.mixin(this.config, opts);

  this.init.apply(this, arguments);
};

Adapter.prototype = new BaseAdapter();
Adapter.prototype.constructor = Adapter;

_bucketizeModelName = function (name) {
  var bucketName = utils.inflection.pluralize(name);
  bucketName = utils.string.snakeize(bucketName);
  return bucketName;
};

// This function is special -- its source is transformed into
// a JSON-safe string and posted as the reduce-sort to Riak
_reduceFunction = function (values) {
  // Dummy value to replace with real sort data -- will look
  // like {'foo': 'asc', 'bar': 'desc'}
  var sort = '__sort__'
  // Directional sort, returns explicit zero if equal
    , baseSort = function (a, b, dir) {
      if (a == b) {
        return 0;
      }
      if (dir == 'asc') {
        return a > b ? 1 : -1;
      }
      else {
        return a > b ? -1 : 1;
      }
    }
  // Iterates each of the sort columns until it finds a
  // pair of values that are not the same
  , columnSort = function (a, b) {
      var ret;
      for (var p in sort) {
        // Call the directional sort for the two values
        // in this property
        ret = baseSort(a[p], b[p], sort[p]);
        // -1 and 1 are truthy
        if (ret) {
          return ret;
        }
      }
      return 1;
    };
  return values.sort(columnSort);
};

_mapReduceQuery = function (bucket, conditions, sort) {
  var reduce = ''
    , reduceSource;

  // If there's any sort, create the reduce stage for sorting
  // 1. The function-source is POSTed as JSON, so transform the
  // function-source into a JSON-safe string
  // 2. Insert the actual sort info, replace the dummy __sort__
  if (sort) {
    reduceSource = sort.toString(); // Get the function source
    reduce = ', {"reduce": {"language": "javascript", "source": "' +
        reduceSource + '"}}';
  }

  return '{"inputs": "' + bucket + '", "query": [{"map": {"language": '+
      '"javascript","source": "function (value, keyData, arg) { ' +
      'var data = Riak.mapValuesJson(value)[0]; if ' + conditions +
      ' { return [data]; } else { return []; } }"}}' + reduce + ']}';
};

utils.mixin(Adapter.prototype, new (function () {


  this.init = function () {};

  this.request = function (options, callback) {
    var opts = options || {}
      , config = this.config
      , method = opts.method || 'GET'
      , url = config.protocol + '://' + config.host + ':' +
            config.port + opts.url;

    //console.log('>>> ', method, ' ', url);

    request({
      method: method
    , url: url
    , data: opts.data || null
    , dataType: 'json'
    , headers: {
        'Content-Type': 'application/json'
      }
    }, callback);
  };

  this.load = function (query, callback) {
    var bucket = _bucketizeModelName(query.model.modelName)
      , id = query.byId
      , requestOpts
      , conditions
      , sort;

    // Single instance-lookup by id
    if (id) {
      requestOpts = {
          url: '/riak/' + bucket + '/' + id
        , method: 'GET'
      };
      this.request(requestOpts, function (err, data) {
        var inst
          , res = [];
        if (err) {
          if (err.statusCode == 404) {
            callback(null, null);
          }
          else {
            callback(err, null);
          }
        }
        else {
          inst = query.model.create(data, {scenario: query.opts.scenario});
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
      conditions = this.transformConditions(query.conditions);
      sort = this.transformSortOrder(query.opts.sort);
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
            var inst = query.model.create(row, {scenario: query.opts.scenario});
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
    }
  };

  // TODO: Eventually should update properties instead of simple overwrite
  this.update = function (data, query, callback) {
    var bucket = _bucketizeModelName(query.model.modelName)
      , id = query.byId
      , requestOpts
      , item = data;
    // Single instance-lookup by id
    if (id) {
      item = item.toData({whitelist: ['id', 'createdAt']});
      item = JSON.stringify(item);

      requestOpts = {
          url: '/riak/' + bucket + '/' + id
        , method: 'PUT'
        , data: item
      };

      this.request(requestOpts, function (err, res) {
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
    var self = this
      , bucket = _bucketizeModelName(query.model.modelName)
      , id = query.byId
      , requestOpts
      , remove
      , ids;

    // Single instance-lookup by id
    if (id) {
      requestOpts = {
          url: '/riak/' + bucket + '/' + id
        , method: 'DELETE'
      };
      this.request(requestOpts, function (err, data) {
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
    // Remove via query
    else {
      remove = function () {
        var id
          , url
          , requestOpts;
        if ((id = ids.shift())) {
          url = '/riak/' + bucket + '/' + id;
          requestOpts = {
            url: url
          , method: 'DELETE'
          };
          self.request(requestOpts, function (err, res) {
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
      if ((ids = query.rawConditions.id)) {
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
    var self = this
      , items = Array.isArray(data) ? data.slice() : [data]
      , bucket = _bucketizeModelName(items[0].type)
      , insert
      , id;

    insert = function () {
      var item;
      if ((item = items.shift())) {
        var url
          , requestOpts;

        id = utils.string.uuid();
        url = '/riak/' + bucket + '/' + id;

        item.id = id;
        item = item.toData({whitelist: ['id', 'createdAt']});
        item = JSON.stringify(item);

        requestOpts = {
          url: url
        , method: 'POST'
        , data: item
        };
        self.request(requestOpts, function (err, res) {
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

  // May need to set bucket props here?
  this.createTable = function (names, callback) {};

  this.dropTable = function (names, callback) {
    var self = this
      , arr = Array.isArray(names) ? names.slice() : [names]
      , drop;

    drop = function () {
      var name
        , bucket
        , requestOpts;
      if ((name = arr.shift())) {
        bucket = _bucketizeModelName(name);
        requestOpts = {
          url: '/buckets/' + bucket + '/keys?keys=true'
        , method: 'GET'
        };
        self.request(requestOpts, function (err, data) {
          var keys = data.keys;
          if (err) {
            callback(err, null);
          }
          else {
            if (keys.length) {
              model[name].remove({id: keys}, {}, function (err, data) {
                if (err) {
                  callback(err, null);
                }
                else {
                  drop();
                }
              });
            }
            else {
              drop();
            }
          }
        });
      }
      else {
        callback(null, true);
      }
    };
    drop();
  };

})());

utils.mixin(Adapter.prototype, mr);

module.exports.Adapter = Adapter;


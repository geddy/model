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
  this.config = this.loadConfig(_baseConfig, opts);
  this.client = null;

  this.init.apply(this, arguments);
};

Adapter.prototype = new BaseAdapter();
Adapter.prototype.constructor = Adapter;

_bucketizeModelName = function (name) {
  var bucketName = utils.inflection.pluralize(name);
  bucketName = utils.string.snakeize(bucketName);
  return bucketName;
};

_mapReduceQuery = function (bucket, conditions, sort, skip, limit) {
  var reduce = ''
    , currSource
    , reduceSources = {}
    , reduceSource;

  // If there's any sort, create the reduce stage for sorting
  if (sort) {
    currSource = sort.toString(); // Get the function source
    currSource = currSource.replace('function anonymous', 'function sortReduce');
    reduceSources.sortReduce = currSource;
  }

  if (skip) {
    reduceSources.skipReduce = 'function skipReduce(values) { return values.slice(' +
        (skip + 1) + '); }';
  }

  if (limit) {
    // `slice` returns a new array *up to but not including* end position
    reduceSources.limitReduce = 'function limitReduce(values) { return values.slice(0, ' +
        limit + '); }';
  }

  if (Object.keys(reduceSources).length) {
    reduceSource = 'function allReduce(values) { ';
    for (var p in reduceSources) {
      reduceSource += reduceSources[p] + ' values = ' + p + '(values); '
    }
    reduceSource += ' return values; }';
    reduce = ', {"reduce": {"language": "javascript", "source": "' +
        reduceSource + '"}}';
  }

  return '{"inputs": "' + bucket + '", "query": [{"map": {"language": '+
      '"javascript","source": "function (value, keyData, arg) { ' +
      'if (value.values[0].metadata[\'X-Riak-Deleted\'] == \'true\') { return []; } ' +
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

    if (model.log) {
      model.log('method: ', method +  ', url:' + url + ', data: ' +
          JSON.stringify(opts.data));
    }

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
      , opts = query.opts
      , sort
      , skip
      , limit;

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
            if(opts.limit == 1)
              callback(null, undefined);
            else
              callback(null, []);
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
          if (opts.limit == 1) {
            res = res[0];
          }
          callback(null, res);
        }
      });
    }
    // Teh mapreducy
    else {
      conditions = this.transformConditions(query.conditions);
      sort = this.transformSortOrder(opts.sort);
      skip = typeof opts.skip != 'undefined' ? opts.skip : null;
      limit = typeof opts.limit != 'undefined' ? opts.limit : null;
      requestOpts = {
          url: '/mapred'
        , method: 'POST'
        , data: _mapReduceQuery(bucket, conditions, sort, skip, limit)
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

          if (query.opts.count) {
            res = res.length;
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
      item = item.toJSON();
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

        id = item.id || utils.string.uuid();
        url = '/riak/' + bucket + '/' + id;

        item.id = id;
        item = item.toJSON();
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
          var keys;
          if (err) {
            callback(err, null);
          }
          else {
            keys = data.keys;
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


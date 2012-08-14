
var query = {}
  , utils = require('utilities')
  , model = require('../index')
  , operation = require('./operation')
  , comparison = require('./comparison');

query.Query = function (model, conditions, options) {
  this.model = null;
  this.conditions = null;
  this.initialize.apply(this, arguments);
};

query.Query.prototype = new (function () {

  var _comparisonCtorNames = {
        'eql': 'EqualTo'
      , 'ne': 'NotEqual'
      , 'in': 'In'
      , 'like': 'Like'
      , 'gt': 'GreaterThan'
      , 'lt': 'LessThan'
      , 'gte': 'GreaterThanOrEqual'
      , 'lte': 'LessThanOrEqual'
      }

    , _createIsValidField = function () {
        var reg = {
              id: true
            , createdAt: true
            , updatedAt: true
            }
          , props = model.descriptionRegistry[
              this.model.modelName].properties;
        for (var p in props) {
          reg[p] = true;
        }
        return function (key) {
          return !!reg[key];
        };
      }

    , _createConditions = function (conditions) {
        var op = new operation.create('and')
          , comp;
        for (var key in conditions) {
          // TODO: Handle associations
          comp = _createComparison.apply(this, [key, conditions[key]]);
          op.add(comp);
        }
        return op;
      }

    , _createComparison = function (key, val) {
        var type
          , descr = model.descriptionRegistry[
              this.model.modelName].properties[key]
          , datatype
          , opts = _createComparisonOpts.apply(this, [key]);

        // FIXME: How the fuck to handle IDs?
        // id isn't in the defined props
        if (key == 'id') {
          datatype = 'string';
        }
        else {
          datatype = descr.datatype;
        }

        // Non-null objects
        if (val && typeof val == 'object') {
          for (var p in val) {
            type = p;
            val = val[p];
          }
        }
        else {
          type = 'eql'
        }

        // TODO: Validate the value for both the particular field
        // (e.g., must be a numeric) and the type of comparison
        // (e.g., 'IN' must be a collection, etc)
        return comparison.create(_comparisonCtorNames[type], key, val,
            datatype, opts);
      }

    , _createComparisonOpts = function (key) {
        var opts = this.opts
          , lowercase = opts.lowercase
          , ret = {};
        ['lowercase'].forEach(function (k) {
          var opt = opts[k]
            , included;
          if (opt) {
            if (Array.isArray(opt)) {
              if (opt.some(function (o) {
                return o == key;
              })) {
                ret[k] = true;
              }
            }
            else {
              ret[k] = true;
            }
          }
        });
        return ret;
      }

    , _parseOpts = function (options) {
        var opts = options || {}
          , ret = {}
          , val
          , parsed
          , defaultDir = 'asc';
        for (var prop in opts) {
          val = opts[prop];
          switch (prop) {
            case 'sort':
              // 'foo,bar,baz'
              if (typeof val == 'string') {
                val = val.split(',');
              }
              // ['foo', 'bar', 'baz']
              if (Array.isArray(val)) {
                parsed = {};
                val.forEach(function (v) {
                  parsed[v] = defaultDir;
                });
              }
              else {
                parsed = val;
              }
              // Now there's a well-formed obj, validate fields
              for (var p in parsed) {
                val = parsed[p].toLowerCase();
                if (!this.isValidField(p)) {
                  throw new Error(p + ' is not a valid field for ' +
                      this.model.modelName);
                }
                if (!(val == 'asc' || val == 'desc')) {
                  throw new Error('Sort directon for ' + p +
                      ' field on ' + this.model.modelName + ' must be ' +
                      'either "asc" or "desc"');
                }
              }
              ret[prop] = parsed;
              break;
            default:
              ret[prop] = opts[prop];
          }
        }
        return ret;
      };

  this.initialize = function (model, conditions, opts) {
    this.model = model;
    this.isValidField = _createIsValidField.apply(this);
    this.opts = _parseOpts.apply(this, [opts || {}]);
    this.conditions = _createConditions.apply(this, [conditions]);
  };


})();

module.exports = query;

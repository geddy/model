
var query = {}
  , model = require('../model')
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
          , descr;
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
        //descr = model.descriptionRegistry[this.model.modelName].properties[key];
        return comparison.create(_comparisonCtorNames[type], key, val);
      };

  this.initialize = function (model, conditions, options) {
        console.dir(model);
    this.model = model;
    this.conditions = _createConditions.call(this, conditions);
    this.options = options || {};
  };


})();

module.exports = query;

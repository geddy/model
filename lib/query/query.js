
var query = {}
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
          , datatype;
        // FIXME: How the fuck to handle IDs?
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
            datatype);
      };

  this.initialize = function (model, conditions, options) {
    this.model = model;
    this.conditions = _createConditions.call(this, conditions);
    this.options = options || {};
  };


})();

module.exports = query;

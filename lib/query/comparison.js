var utils = require('utilities')
  , datatypes = require('../datatypes')
  , comparison = {}
  , ComparisonBase
  , comparisonTypes;

comparison.create = function () {
  var args = Array.prototype.slice.call(arguments)
    , type = args.shift()
    , ctor = utils.string.capitalize(type) + 'Comparison'
    , inst;

    ctor = comparisonTypes[ctor];
    inst = new ctor();
    inst.type = type;
    inst.initialize.apply(inst, args);
    return inst;
};

ComparisonBase = new (function () {
  this.initialize = function (field, value, datatype, opts) {
    this.parent = null;
    this.descendants = [];
    this.field = field;
    this.value = value;
    // FIXME: Should use Property objects
    this.datatype = datatype;
    this.opts = opts || {};
  };

})();

comparisonTypes = {
  EqualToComparison: function () {
    this.comparatorString = '=';
  }

, NotEqualToComparison: function () {
    this.comparatorString = '!=';
  }

, InclusionComparison: function () {
    this.comparatorString = 'IN';
  }

, LikeComparison: function () {
    this.comparatorString = 'LIKE';
  }

, GreaterThanComparison: function () {
    this.comparatorString = '>';
  }

, LessThanComparison: function () {
    this.comparatorString = '<';
  }

, GreaterThanOrEqualComparison: function () {
    this.comparatorString = '>=';
  }

, LessThanOrEqualComparison: function () {
    this.comparatorString = '<=';
  }

};

(function () {
  var type;
  for (var t in comparisonTypes) {
    type = comparisonTypes[t];
    type.prototype = ComparisonBase;
    type.prototype.constructor = type;
  }
})();

// Export the specific constructors as well as the `create` function
utils.mixin(comparison, comparisonTypes);

module.exports = comparison;



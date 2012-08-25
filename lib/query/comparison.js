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

ComparisonBase = function () {
  this.initialize = function (field, value, datatype, opts) {
    this.parent = null;
    this.descendants = [];
    this.field = field;
    this.value = value;
    // FIXME: Should use Property objects
    this.datatype = datatype;
    this.opts = opts || {};
  };

};

comparisonTypes = {
  EqualToComparison: function () {
    this.jsComparatorString = '==';
    this.sqlComparatorString = '=';
  }

, NotEqualToComparison: function () {
    this.jsComparatorString = '!=';
    this.sqlComparatorString = '!=';
  }

, GreaterThanComparison: function () {
    this.jsComparatorString = '>';
    this.sqlComparatorString = '>';
  }

, LessThanComparison: function () {
    this.jsComparatorString = '<';
    this.sqlComparatorString = '<';
  }

, GreaterThanOrEqualComparison: function () {
    this.jsComparatorString = '>=';
    this.sqlComparatorString = '>=';
  }

, LessThanOrEqualComparison: function () {
    this.jsComparatorString = '<=';
    this.sqlComparatorString = '<=';
  }

, InclusionComparison: function () {
    this.sqlComparatorString = 'IN';
  }

, LikeComparison: function () {
    this.sqlComparatorString = 'LIKE';
  }

};

(function () {
  var ctor;
  for (var t in comparisonTypes) {
    ctor = comparisonTypes[t];
    ctor.prototype = new ComparisonBase();
    ctor.prototype.constructor = ctor;
  }
})();

// Export the specific constructors as well as the `create` function
utils.mixin(comparison, comparisonTypes);

module.exports = comparison;



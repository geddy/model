var utils = require('utilities')
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
  this.initialize = function (field, value) {
    this.parent = null;
    this.descendants = [];
    this.field = field;
    this.value = value;
  };

  this.toString = function () {
    var val = this.value
      , comparator = this.comparatorString;
    // Special case for null equality
    if (val === null) {
      comparator = this.type == 'EqualTo' ?
        'IS' : 'IS NOT';
    }
    return this.field + ' ' +
        comparator + ' ' +
        this.value;
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

for (var t in comparisonTypes) {
  comparisonTypes[t].prototype = ComparisonBase;
}

// Export the specific constructors as well as the `create` function
utils.mixin(comparison, comparisonTypes);

module.exports = comparison;



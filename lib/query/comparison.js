var utils = require('utilities')
  , datatypes = require('../datatypes')
  , comparison = {}
  , ComparisonBase
  , comparisonTypes
  , _validateForDatatype;

_validateForDatatype = function (val) {
  var validator = datatypes[this.datatype].validate
    , validated = validator(this.field, val, {});
  return !validated.err;
};

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
  this.initialize = function (model, field, value, datatype, opts) {
    this.parent = null;
    this.descendants = [];
    // FIXME: Should use Property objects
    this.model = model;
    this.field = field;
    this.value = value;
    this.datatype = datatype;
    this.opts = opts || {};
  };

  // Most basic validation is to check that the value for the
  // comparison is actually valid for this field
  this.isValid = function () {
    return _validateForDatatype.apply(this, [this.value]);
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

    this.isValid = function () {
      var self = this
        , val = this.value;
      if (!Array.isArray(val)) {
        return false;
      }
      return val.every(function (item) {
        return _validateForDatatype.apply(self, [item]);
      });
    };
  }

, LikeComparison: function () {
    this.sqlComparatorString = 'LIKE';

    this.isValid = function () {
      if (!(this.datatype == 'string' || this.datatype == 'text')) {
        return false;
      }
      return this.constructor.prototype.isValid.call(this);
    };
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



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

  this.serializeFieldName = function () {
    var name = this.field;
    if (this.opts.lowercase) {
      name = 'LOWER(' + name + ')';
    }
    return name;
  };

  this.serializeComparator = function () {
    var val = this.value
      , comparator = this.comparatorString;
    if (val === null) {
      comparator = this.type == 'EqualTo' ?
        'IS' : 'IS NOT';
    }
    return comparator;
  };

  this.serializeValue = function () {
    var val = this.value;
    if (val === null) {
      val = 'NULL';
    }
    else {
      val = datatypes[this.datatype].serialize(val, {
          useQuotes: true
        , escape: true
      });
    }
    return val;
  };

  this.toString = function () {
    return [this.serializeFieldName(),
        this.serializeComparator(),
        this.serializeValue()].join(' ');
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

    this.serializeValue = function () {
      var val = this.value;
      if (val === null) {
        val = 'NULL';
      }
      else {
        if (val.indexOf('%') == -1) {
          val += '%';
        }
        val = datatypes[this.datatype].serialize(val, {
            useQuotes: true
          , escape: true
        });
      }
      return val;
    };
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



var create
  , ComparisonBase
  , comparisonTypes;

create = function () {
  var type = arguments[0]
    , ctor = geddy.string.capitalize(type) + 'Comparison';
    , inst;
    ctor = operationTypes[ctor];
    inst = new ctor();
    inst.initialize.apply(inst, arguments);
    return inst;
};

ComparisonBase = function () {
  this.type = null;
  this.parent = null;
  this.descendants = [];
  this.field = null;
  this.value = null;
};

ComparisonBase.prototype = new (function () {

  this.initialize = function (type, field, value) {
    this.type = type;
    this.field = field;
    this.value = value;
  };

})();

comparisonTypes = {
  EqualToComparison: function () {
    this.comparatorString = '=';
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


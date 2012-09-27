
var BaseTransformer = function () {
};

BaseTransformer.prototype = new (function () {

  this.tranformSortOrder = function () {};

  this.tranformConditions = function () {};

  this.transformOperation = function () {};

  this.transformComparison = function () {};

  this.transformComparisonFieldName = function () {};

  this.transformComparisonComparator = function () {};

  this.transformComparisonValue = function () {};

})();

module.exports.BaseTransformer = BaseTransformer;

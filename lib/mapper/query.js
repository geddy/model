
var query = new (function () {

})();

query.Query = function (model, options) {
  var opts = options || {};

  this.model = model;
  this.conditions = this.targetConditions(opts.conditions);
};

query.Query.prototype = new (function () {

  this.targetQuery = function (source) {
  };

  this.targetConditions = function (source, key, key) {
  };

})();

module.exports = query;

var model = require('../../lib');

var Result = function () {
  this.property('title', 'string');
  this.property('value', 'number');
};

Result.prototype.someMethod = function () {
};

module.exports.Result = Result;





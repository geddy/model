var model = require('../../lib');

var FunActivity = function () {
  this.property('title', 'string');
  this.property('description', 'text');
  this.belongsTo('Schedule');
};

FunActivity.prototype.someMethod = function () {
};

FunActivity = model.register('FunActivity', FunActivity);

module.exports.FunActivity = FunActivity;






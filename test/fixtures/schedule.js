var model = require('../../lib');

var Schedule = function () {
  this.property('title', 'string');
  this.property('description', 'text');
  this.belongsTo('Event');
  this.belongsTo('Editor', {model: 'Person'});
  this.hasMany('FunActivities');
};

Schedule.prototype.someMethod = function () {
};

module.exports.Schedule = Schedule;

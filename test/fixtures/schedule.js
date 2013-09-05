var model = require('../../lib');

var Schedule = function () {
  this.property('title', 'string');
  this.property('description', 'text');
  this.belongsTo('Event');
};

Schedule.prototype.someMethod = function () {
};

Schedule = model.register('Schedule', Schedule);

module.exports.Schedule = Schedule;





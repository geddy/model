var model = require('../../lib');

var Event = function () {
  this.property('title', 'string');
  this.property('description', 'text');

  this.hasMany('Participants', {model: 'People'});
  this.hasMany('Admins', {model: 'People'});
  this.hasMany('Admins', {model: 'People'});
};

Event.prototype.someMethod = function () {
};

Event = model.register('Event', Event);

module.exports.Event = Event;




var model = require('../../lib');

var Event = function () {
  this.property('title', 'string');
  this.property('description', 'text');

  this.hasMany('Admins', {model: 'People'});
  this.hasMany('Participants', {model: 'People', through: 'Participations'});
  this.hasMany('Photos');
  this.hasMany('Comments', {model: 'Messages'});
};

Event.prototype.someMethod = function () {
};

Event = model.register('Event', Event);

module.exports.Event = Event;




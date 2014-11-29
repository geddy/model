var model = require('../../lib');

var Event = function () {
  this.property('title', 'string');
  this.property('description', 'text');
  this.property('startingOn', 'date');

  this.validatesPresent('title', {message: 'Argle-bargle'});
  this.validatesPresent('description', {on: ['create', 'reify']});

  this.hasOne('Owner', {model: 'People'});
  this.hasMany('Admins', {model: 'People'});
  this.hasMany('Participations');
  this.hasMany('Participants', {model: 'People', through: 'Participations'});
  this.hasMany('Photos');
  this.hasMany('Comments', {model: 'Messages'});
};

Event.prototype.someMethod = function () {
};

Event.findByTitle = function (t, cb) {
  model.Event.all({title: t}, cb);
};

module.exports.Event = Event;




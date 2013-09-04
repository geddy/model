var model = require('../../lib');

var Person = function () {
  this.property('familyName', 'string');
  this.property('givenName', 'string');
  this.property('title', 'string');
  this.property('description', 'text');

  this.hasMany('Events', {through: 'Participations'});
};

Person.prototype.someMethod = function () {
};

Person = model.register('Person', Person);

module.exports.Person = Person;





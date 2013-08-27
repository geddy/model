var model = require('../../lib');

var Person = function () {
  this.property('familyName', 'string');
  this.property('givenName', 'string');
  this.property('title', 'string');
};

Person.prototype.someMethod = function () {
};

Person = model.register('Person', Person);

module.exports.Person = Person;





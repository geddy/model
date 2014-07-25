var model = require('../../lib');

var Participation = function () {
  this.property('title', 'string'); // Need this, all fixtures have one
  this.property('description', 'text');
  this.belongsTo('Participant', {model: 'People'});
  this.belongsTo('Event');
};

Participation.prototype.someMethod = function () {
};

module.exports.Participation = Participation;





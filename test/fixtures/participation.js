var model = require('../../lib');

var Participation = function () {
  this.property('title', 'string'); // Need this, all fixtures have one
  this.belongsTo('Participant', {model: 'People'});
  this.belongsTo('Event');
};

Participation.prototype.someMethod = function () {
};

Participation = model.register('Participation', Participation);

module.exports.Participation = Participation;





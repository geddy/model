var model = require('../../lib');

var Friendship = function () {
  this.property('title', 'string'); // Need this, all fixtures have one
  this.property('description', 'text');
  this.property('approved', 'boolean');

  this.belongsTo('Friender', {model: 'People'});
  this.belongsTo('Friend', {model: 'People'});
};

Friendship.prototype.someMethod = function () {
};

module.exports.Friendship = Friendship;






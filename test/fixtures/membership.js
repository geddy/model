var model = require('../../lib');

var Membership = function () {
  this.property('name', 'string', {required: true});

  this.belongsTo('User');
  this.belongsTo('Team');
};

Membership = model.register('Membership', Membership);

module.exports.Membership = Membership;



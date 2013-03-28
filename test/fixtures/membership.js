var model = require('../../lib');

var Membership = function () {
  this.belongsTo('User');
  this.belongsTo('Team');
};

Membership = model.register('Membership', Membership);

module.exports.Membership = Membership;



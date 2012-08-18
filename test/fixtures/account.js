var model = require('../../lib');

var Account = function () {
  this.property('location', 'string');

  this.belongsTo('User');

  this.autoIncrementId = false;
};

Account.prototype.someMethod = function () {
  // Do some stuff on a Account instance
};

Account = model.register('Account', Account);

module.exports.Account = Account;



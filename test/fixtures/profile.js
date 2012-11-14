var model = require('../../lib');

var Profile = function () {
  this.property('address1', 'string');
  this.property('address2', 'string');
  this.property('nickname', 'string');
  this.property('setting1', 'boolean');
  this.property('setting2', 'boolean');

  this.belongsTo('User');
};

Profile.prototype.someMethod = function () {
  // Do some stuff on a Profile instance
};

Profile = model.register('Profile', Profile);

module.exports.Profile = Profile;


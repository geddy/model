var model = require('../../lib');

var Team = function () {
  this.property('name', 'string', {required: true});

  this.hasMany('Memberships');
  this.hasMany('Users', {through: 'Memberships'});
};

Team = model.register('Team', Team);

module.exports.Team = Team;


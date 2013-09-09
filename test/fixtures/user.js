var model = require('../../lib');

var User = function () {
  this.property('login', 'string', {required: true});
  this.property('password', 'string', {required: true});
  this.property('lastName', 'string');
  this.property('firstName', 'string');

  this.validatesPresent('login');
  this.validatesFormat('login', /[a-z]+/, {message: 'Subdivisions!'});
  this.validatesLength('login', {min: 3, on: ['create', 'reify']});
  this.validatesConfirmed('password', 'confirmPassword', {on: 'create', message: 'Parallax!'});


};

User.prototype.someMethod = function () {
  // Do some stuff on a User instance
};

User.findByLogin = function (login, callback) {
  User.all({login: login}, callback);
}

User = model.register('User', User);

module.exports.User = User;

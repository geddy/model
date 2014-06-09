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

  this.afterCreate = function () {
    this.lastName = 'afterCreate';
  }
  this.beforeValidate = function (params) {
    params.firstName = params.firstName || 'Zerp'
  }
  this.afterValidate = function () {
    this.lastName = 'afterValidate';
  }
  this.afterSave = function () {
    this.lastName = 'afterSave';
  }
  this.afterUpdate = function () {
    this.lastName = 'afterUpdate';
  }
  this.afterUpdateProperties = function () {
    this.lastName = 'afterUpdateProperties';
  }
};

User.prototype.someMethod = function () {
  // Do some stuff on a User instance
};

User.findByLogin = function (login, callback) {
  User.all({login: login}, callback);
}

module.exports.User = User;

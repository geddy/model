var assert = require('assert')
  , utils = require('utilities')
  , EventEmitter = require('events').EventEmitter
  , model = require('../../lib')
  , User = require('../fixtures/user').User
  , BaseAdapter = require('../../lib/adapters/base_adapter').BaseAdapter
  , _params
  , tests;

_params = {
  login: 'zzz',
  password: 'asdf',
  confirmPassword: 'asdf',
  firstName: 'Neil'
};

model.registerDefinitions([
  { ctorName: 'User'
  , ctor: User
  }
]);

User = model.User;

User.adapter = new BaseAdapter();

tests = {
  'static has EventEmitter emit': function () {
    assert.equal('function', typeof User.emit);
  }

, 'static has EventEmitter addListener': function () {
    assert.equal('function', typeof User.addListener);
  }

, 'static has EventEmitter once': function () {
    assert.equal('function', typeof User.once);
  }

, 'emit static beforeCreate': function (next) {
    User.once('beforeCreate', function (data) {
      assert.equal('zzz', data.login);
      next();
    });
    var user = User.create(_params);
  }

, 'emit static create': function (next) {
    User.once('create', function (u) {
      assert.ok(u instanceof User);
      assert.equal('afterCreate', u.lastName);
      next();
    });
    var user = User.create(_params);
  }

, 'emit static beforeValidate': function (next) {
    User.once('beforeValidate', function (u, p) {
      assert.ok(u instanceof User);
      assert.equal('zzz', p.login);
      next();
    });
    var user = User.create(_params);
  }

, 'emit static validate': function (next) {
    User.once('validate', function (u) {
      assert.ok(u instanceof User);
      assert.equal('zzz', u.login);
      assert.equal('afterValidate', u.lastName);
      next();
    });
    var user = User.create(_params);
  }

, 'emit static beforeUpdateProperties': function (next) {
    User.once('beforeUpdateProperties', function (u, p) {
      assert.ok(u instanceof User);
      assert.equal('zzz', u.login);
      assert.equal('yyz', p.login);
      next();
    });
    var user = User.create(_params);
    user.updateProperties({login: 'yyz'});
  }

, 'emit instance beforeUpdateProperties': function (next) {
    var user = User.create(_params);
    user.once('beforeUpdateProperties', function () {
      assert.equal('zzz', user.login);
      next();
    });
    user.save(function () {
      user.updateProperties({login: 'yyz'});
    });
  }

, 'emit static updateProperties': function (next) {
    User.once('updateProperties', function (u) {
      assert.ok(u instanceof User);
      assert.equal('yyz', u.login);
      next();
    });
    var user = User.create(_params);
    user.updateProperties({login: 'yyz'});
  }

, 'emit instance updateProperties': function (next) {
    var user = User.create(_params);
    user.once('updateProperties', function () {
      assert.equal('yyz', user.login);
      assert.equal('afterUpdateProperties', this.lastName);
      next();
    });
    user.save(function () {
      user.updateProperties({login: 'yyz'});
    });
  }

, 'emit static beforeSave': function (next) {
    User.once('beforeSave', function (u) {
      assert.ok(u instanceof User);
      next();
    });
    var user = User.create(_params);
    user.save(function () {});
  }

, 'emit instance beforeSave': function (next) {
    var user = User.create(_params);
    user.once('beforeSave', function () {
      next();
    });
    user.save(function () {});
  }

, 'emit static save': function (next) {
    User.once('save', function (u) {
      assert.ok(u instanceof User);
      next();
    });
    var user = User.create(_params);
    user.save(function () {});
  }

, 'emit instance save': function (next) {
    var user = User.create(_params);
    user.once('save', function (u) {
      assert.equal('afterSave', this.lastName);
      next();
    });
    user.save(function () {});
  }

, 'emit static beforeUpdate': function (next) {
    User.once('beforeUpdate', function (u) {
      assert.ok(u instanceof User);
      next();
    });
    var user = User.create(_params);
    user.save(function () {
      user.save(function () {});
    });
  }

, 'emit instance beforeUpdate': function (next) {
    var user = User.create(_params);
    user.once('beforeUpdate', function (u) {
      next();
    });
    user.save(function () {
      user.save(function () {});
    });
  }

, 'emit static update for single instance': function (next) {
    User.once('update', function (res) {
      assert.ok(res instanceof User);
      next();
    });
    var user = User.create(_params);
    user.save(function () {
      user.save(function () {});
    });
  }

, 'emit instance update': function (next) {
    var user = User.create(_params);
    user.once('update', function (res) {
      assert.equal('afterUpdate', this.lastName);
      next();
    });
    user.save(function () {
      user.save(function () {});
    });
  }

, 'emit static beforeRemove': function (next) {
    User.once('beforeRemove', function (res) {
      assert.ok(res);
      next();
    });
    var user = User.create(_params);
    user.save(function () {
      User.remove(user.id, function () {});
    });
  }

, 'emit static remove': function (next) {
    User.once('remove', function (res) {
      assert.ok(res);
      next();
    });
    var user = User.create(_params);
    user.save(function () {
      User.remove(user.id, function () {});
    });
  }

};

module.exports = tests;

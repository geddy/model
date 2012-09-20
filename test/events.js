var model = require('../lib')
  , utils = require('utilities')
  , assert = require('assert')
  , User = require('./fixtures/user').User
  , BaseAdapter = require('../lib/adapters/base_adapter').BaseAdapter
  , EventEmitter = require('events').EventEmitter
  , _params
  , tests;

_params = {
  login: 'zzz',
  password: 'asdf',
  confirmPassword: 'asdf',
  firstName: 'Neil'
};

model.adapters.User = new BaseAdapter();

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
      next();
    });
    var user = User.create(_params);
  }

, 'emit static beforeSave': function (next) {
    User.once('beforeSave', function (u) {
      assert.ok(u instanceof User);
      next();
    });
    var user = User.create(_params);
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

, 'emit static update': function (next) {
    User.once('update', function (res) {
      assert.ok(res);
      next();
    });
    var user = User.create(_params);
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

, 'last': function () {}

};

module.exports = tests;

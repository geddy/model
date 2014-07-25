var utils = require('utilities')
  , assert = require('assert')
  , model = require('../../lib')
  , User = require('../fixtures/user').User
  , _params
  , tests;

model.registerDefinitions([
  { ctorName: 'User'
  , ctor: User
  }
]);

User = model.User;

_params = {
  login: 'zzz',
  password: 'asdf',
  confirmPassword: 'asdf',
  firstName: 'Neil'
};

tests = {

  'test validity': function () {
    var user = User.create(_params);
    assert.ok(user.isValid());
  }

, 'test login is too short': function () {
    _params.login = 'zz'; // Too short, invalid
    var user = User.create(_params);
    assert.ok(typeof user.errors.login != 'undefined');
  }

, 'test invalid login with custom error message': function () {
    _params.login = '2112'; // Contains numbers, invalid
    var user = User.create(_params);
    // Error message should be customized
    assert.equal(user.errors.login, 'Subdivisions!');
  }

, 'test invalid password with custom error message': function () {
    _params.login = 'zzzz';
    _params.password = 'bbbb'; // Wrong
    var user = User.create(_params);
    // Error message should be customized
    assert.equal(user.errors.password, 'Parallax!');
  }

, 'test login is not too short when updating': function () {
    _params.login = 'zzzzz'; // Long enough to create
    _params.password = 'asdf';
    var user = User.create(_params);
    assert.ok(!user.errors);
    _params.login = 'zz'; // Too short, but should be valid on updates
    user.updateProperties(_params);
    assert.ok(!user.errors);
  }

, 'test login is not too short when creating with scenario option': function () {
    _params.login = 'zz'; // Long enough to create
    var user = User.create(_params, {scenario: 'update'});
    assert.ok(user.errors == null);
  }

, 'test login is too short when updating with scenario option': function () {
    _params.login = 'zzzzzz';
    var user = User.create(_params, {scenario: 'update'});
    assert.ok(user.errors == null);

    _params.login = 'zz'; // Usually valid on updates, we're going to make it invalid by passing scenario:create

    user.updateProperties(_params, {scenario: 'create'});
    assert.ok(typeof user.errors.login != 'undefined');
  }

, 'test missing login': function () {
    delete _params.login; // Contains numbers, invalid
    var user = User.create(_params);
    // Error message should be customized
    assert.ok(typeof user.errors.login != 'undefined');

    _params.login = 'zzz'; // Restore to something valid
  }

, 'test no password confirmation': function () {
    var p = utils.mixin({}, _params),
        user;
    p.confirmPassword = 'fdsa';
    var user = User.create(p);
    // Error message should be customized
    assert.ok(typeof user.errors.password != 'undefined');
  }

, 'setting default values': function () {
    var p = utils.mixin({}, _params),
        user;
    delete p.firstName;
    user = User.create(p);
    assert.equal('Zerp', user.firstName);
  }

};

module.exports = tests;


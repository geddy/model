/*
Notes:
id, createdAt, updatedAt are auto-fields -- if not defined, handle
  transparently. If defined, make sure it's present and valid before using

Allow auto-increment setting for id

Relies on 'saved' property to know if an instanced is new or existing
*/

var utils = require('utilities')
  , model = require('../../../lib')
  , Adapter = require('../../../lib/adapters/sql/postgres').Adapter
  , Query = require('../../../lib/query/query').Query
  , generator = require('../../../lib/generators/sql')
  , adapter
  , assert = require('assert')
  , currentId
  , tests
  , Zooby = require('../../fixtures/zooby').Zooby
  , User = require('../../fixtures/user').User
  , Profile = require('../../fixtures/profile').Profile
  , Account = require('../../fixtures/account').Account;

tests = {
  'before': function (next) {
    var sql;

    adapter = new Adapter({
      database: 'model_test'
    });
    adapter.once('connect', function () {
      var sql = generator.createTable(['Zooby',
          'User', 'Profile', 'Account']);
      adapter.exec(sql, function (err, data) {
        if (err) {
          throw err;
        }
        next();
      });
    });
    adapter.connect();

    model.adapters = {
      'Zooby': adapter
    , 'User': adapter
    , 'Profile': adapter
    , 'Account': adapter
    };

  }

, 'after': function (next) {
    adapter.once('disconnect', function () {
      next();
    });
    adapter.disconnect();
  }

, 'test create adapter': function () {
    assert.ok(adapter instanceof Adapter);
  }

, 'test exec': function (next) {
    adapter.exec('CREATE TABLE foo (bar varchar(256) ); DROP TABLE foo;',
        function (err, data) {
      if (err) {
        throw err;
      }
      next();
    });
  }

, 'test save new, auto-increment id': function (next) {
    var u = User.create({
      login: 'asdf'
    , password: 'zerb'
    , confirmPassword: 'zerb'
    });
    u.save(function (err, data) {
      if (err) {
        throw err;
      }
      currentId = u.id;
      next();
    });
  }

, 'test first via auto-increment id': function (next) {
    User.first(currentId, {}, function (err, data) {
      if (err) {
        throw err;
      }
      assert.equal(data.id, currentId);
      next();
    });
  }

, 'test hasOne association, set from owner': function (next) {
    var u = User.create({
      login: 'asdf'
    , password: 'zerb'
    , confirmPassword: 'zerb'
    });
    u.save(function (err, data) {
      if (err) {
        throw err;
      }
      currentId = u.id;
      User.first(currentId, {}, function (err, data) {
        var user = data
          , profile;
        if (err) {
          throw err;
        }
        profile = Profile.create({});
        user.setProfile(profile);
        user.save(function (err, data) {
          if (err) {
            throw err;
          }
          user.getProfile(function (err, data) {
            assert.equal(profile.id, data.id);
            if (err) {
              throw err;
            }
            next();
          });
        });
      });
    });
  }

, 'test hasOne association, set from owned': function (next) {
    var u = User.create({
      login: 'asdf'
    , password: 'zerb'
    , confirmPassword: 'zerb'
    });
    u.save(function (err, data) {
      if (err) {
        throw err;
      }
      currentId = u.id;
      User.first(currentId, {}, function (err, data) {
        var user = data
          , profile;
        if (err) {
          throw err;
        }
        profile = Profile.create({});
        profile.setUser(user);
        profile.save(function (err, data) {
          if (err) {
            throw err;
          }
          user.getProfile(function (err, data) {
            assert.equal(profile.id, data.id);
            if (err) {
              throw err;
            }
            next();
          });
        });
      });
    });
  }

, 'test hasMany association, set from owner': function (next) {
    var u = User.create({
      login: 'asdf'
    , password: 'zerb'
    , confirmPassword: 'zerb'
    });
    u.save(function (err, data) {
      if (err) {
        throw err;
      }
      currentId = u.id;
      User.first(currentId, {}, function (err, data) {
        var user = data
          , account;
        if (err) {
          throw err;
        }
        user.addAccount(Account.create({}));
        user.addAccount(Account.create({}));
        user.save(function (err, data) {
          if (err) {
            throw err;
          }
          user.getAccounts(function (err, data) {
            assert.equal(2, data.length);
            if (err) {
              throw err;
            }
            next();
          });
        });
      });
    });
  }

};

utils.mixin(tests, require('../shared'));

module.exports = tests;

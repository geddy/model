var utils = require('utilities')
  , model = require('../../../lib')
  , Adapter = require('../../../lib/adapters/sql/postgres').Adapter
  , generator = require('../../../lib/generators/sql')
  , adapter
  , assert = require('assert')
  , currentId
  , tests
  , Zooby = require('../../fixtures/zooby').Zooby
  , User = require('../../fixtures/user').User
  , Profile = require('../../fixtures/profile').Profile
  , Account = require('../../fixtures/account').Account
  , Team = require('../../fixtures/team').Team
  , Membership = require('../../fixtures/membership').Membership
  , shared = require('../shared');

tests = {
  'before': function (next) {
    var sql;

    adapter = new Adapter({
      database: 'model_test'
    });
    adapter.once('connect', function () {
      var sql = generator.createTable(['Zooby',
          'User', 'Profile', 'Account', 'Membership', 'Team']);
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
    , 'Membership': adapter
    , 'Team': adapter
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

, 'test save new': function (next) {
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

, 'test first': function (next) {
    User.first(currentId, {}, function (err, data) {
      if (err) {
        throw err;
      }
      assert.equal(data.id, currentId);
      next();
    });
  }

, 'test remove': function (next) {
    User.remove(currentId, {}, function (err, data) {
      if (err) {
        throw err;
      }
      User.first(currentId, {}, function (err, data) {
        if (err) {
          throw err;
        }
        assert.ok(!data);
        next();
      });
    });
  }

};

for (var p in shared) {
  tests[p + ' (Postgres)'] = shared[p];
}

var eagerAssnTests = {
  'test includes eager-fetch of hasMany association': function (next) {
    User.all({}, {includes: ['kids', 'avatars']}, function (err, data) {
      data.forEach(function (u) {
        if (u.id == currentId) {
          assert.equal(2, u.avatars.length);
        }
      });
      next();
    });
  }

, 'test hasMany through': function (next) {
    User.first({login: 'asdf'}, function (err, data) {
      if (err) {
        throw err;
      }
      var u = data;
      u.addTeam(Team.create({
        name: 'foo'
      }));
      u.addTeam(Team.create({
        name: 'bar'
      }));
      u.save(function (err, data) {
        currentId = u.id;
        u.getTeams(function (err, data) {
          assert.equal(2, data.length);
          data.forEach(function (item) {
            assert.equal('Team', item.type);
          });
          next();
        });
      });
    });
  }

, 'test includes eager-fetch of hasMany/through association': function (next) {
    User.all({login: 'asdf'}, {includes: 'teams'}, function (err, data) {
      data.forEach(function (u) {
        if (u.id == currentId) {
          assert.equal(2, u.teams.length);
        }
      });
      next();
    });
  }

};

for (var p in eagerAssnTests) {
  tests[p + ' (Postgres)'] = eagerAssnTests[p];
}

module.exports = tests;

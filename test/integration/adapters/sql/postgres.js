var utils = require('utilities')
  , assert = require('assert')
  , model = require('../../../../lib')
  , Adapter = require('../../../../lib/adapters/sql/postgres').Adapter
  , generator = require('../../../../lib/generators/sql')
  , adapter
  , currentId
  , tests
  , Zooby = require('../../../fixtures/zooby').Zooby
  , User = require('../../../fixtures/user').User
  , Profile = require('../../../fixtures/profile').Profile
  , Account = require('../../../fixtures/account').Account
  , Team = require('../../../fixtures/team').Team
  , Membership = require('../../../fixtures/membership').Membership
  , config = require('../../../config')
  , shared = require('../shared');

tests = {
  'before': function (next) {
    var relations = [
          'Zooby'
        , 'User'
        , 'Profile'
        , 'Account'
        , 'Membership'
        , 'Team'
        ]
      , models = [];

    adapter = new Adapter(config.postgres);
    adapter.once('connect', function () {
      var sql = '';

      sql += generator.dropTable(relations);
      sql += generator.createTable(relations);

      adapter.exec(sql, function (err, data) {
        if (err) {
          throw err;
        }
        next();
      });
    });
    adapter.connect();

    model.adapters = {};
    relations.forEach(function (r) {
      model[r].adapter = adapter;
      models.push({
        ctorName: r
      });
    });

    model.registerDefinitions(models);
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
    , password: 'zerbzerb'
    , confirmPassword: 'zerbzerb'
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
    User.all({}, {includes: ['kids', 'avatarProfiles']}, function (err, data) {
      data.forEach(function (u) {
        if (u.id == currentId) {
          assert.equal(2, u.avatarProfiles.length);
        }
      });
      next();
    });
  }

, 'test includes eager-fetch of belongsTo association': function (next) {
    Profile.all({}, {includes: ['user']}, function (err, data) {
      var foundUser = false;
      data.forEach(function (p) {
        // One of these dudes should have a user
        if (p.user) {
          foundUser = p.user;
        }
      });
      assert.ok(foundUser);
      next();
    });
  }

, 'test includes eager-fetch of hasMany with association sort': function (next) {
    User.all({}, {
        includes: ['kids'
      , 'avatarProfiles'], sort: {'login': 'desc', 'kids.login': 'asc'}
    }, function (err, data) {
      assert.equal('zzzz', data[0].login);
      data.forEach(function (u) {
        if (u.kids && u.kids.length) {
          assert.equal('zxcv', u.kids[1].login);
        }
      });
      next();
    });
  }

, 'test includes eager-fetch of hasMany with `first` lookup for owner obj': function (next) {
    User.first({login: 'asdf', password: 'zerb4'}, {includes: ['kids', 'avatarProfiles']},
        function (err, data) {
      assert.equal(2, data.kids.length);
      next();
    });
  }

, 'test hasMany through with auto-save for add side': function (next) {
    User.first({login: 'asdf', password: 'zerb1'}, function (err, data) {
      if (err) {
        throw err;
      }
      var u = data;
      u.addTeam(Team.create({
        name: 'foo'
      }));
      u.save(function (err, data) {
        currentId = u.id;
        u.getTeams(function (err, data) {
          assert.equal(1, data.length);
          data.forEach(function (item) {
            assert.equal('Team', item.type);
          });
          next();
        });
      });
    });
  }

, 'test hasMany through with already saved on both sides': function (next) {
    User.first({login: 'asdf', password: 'zerb1'}, function (err, data) {
      var u, t;
      if (err) {
        throw err;
      }
      u = data;
      t = Team.create({
        name: 'bar'
      });
      t.save(function (err, data) {
        u.addTeam(t);
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

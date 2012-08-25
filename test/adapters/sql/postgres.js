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
  , testItems = []
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

, 'test save new, string UUID id': function (next) {
    var z = Zooby.create({foo: 'FOO'});
    z.save(function (err, data) {
      if (err) {
        throw err;
      }
      currentId = z.id;
      next();
    });
  }

, 'test first via string id': function (next) {
    Zooby.first(currentId, {}, function (err, data) {
      if (err) {
        throw err;
      }
      assert.equal(data.id, currentId);
      next();
    });
  }

// TODO: Load via array of ids

, 'test first via object': function (next) {
    Zooby.first({id: currentId}, {}, function (err, data) {
      if (err) {
        throw err;
      }
      assert.equal(data.id, currentId);
      next();
    });
  }

, 'test save existing': function (next) {
    Zooby.first(currentId, {}, function (err, data) {
      if (err) {
        throw err;
      }
      var inst = data;
      data.updateProperties({
        foo: 'BAR'
      });
      inst.save(function (err, data) {
        if (err) {
          throw err;
        }
        Zooby.first(currentId, {}, function (err, data) {
          if (err) {
            throw err;
          }
          assert.equal(data.foo, 'BAR');
          next();
        });
      });
    });
  }

, 'test remove': function (next) {
    Zooby.remove(currentId, {}, function (err, data) {
      if (err) {
        throw err;
      }
      Zooby.first(currentId, {}, function (err, data) {
        if (err) {
          throw err;
        }
        assert.ok(!data);
        next();
      });
    });
  }

, 'test save collection': function (next) {
    var dt = new Date();
    testItems.push(Zooby.create({
      foo: 'FOO'
    , zong: utils.date.add(dt, 'day', -1)
    }));
    testItems.push(Zooby.create({
      foo: 'BAR'
    , zong: utils.date.add(dt, 'day', -2)
    }));
    testItems.push(Zooby.create({
      foo: 'BAZ'
    , zong: utils.date.add(dt, 'day', -3)
    }));
    Zooby.save(testItems, function (err, data) {
      if (err) {
        throw err;
      }
      next();
    });
  }

, 'test all, by string equality': function (next) {
    Zooby.all({foo: 'FOO'}, {}, function (err, data) {
      if (err) {
        throw err;
      }
      assert.equal(data.length, 1);
      assert.equal(testItems[0].foo, data[0].foo);
      next();
    });
  }

, 'test all, by string LIKE case-sensitive': function (next) {
    Zooby.all({foo: {'like': 'B'}}, {}, function (err, data) {
      if (err) {
        throw err;
      }
      assert.equal(data.length, 2);
      next();
    });
  }

, 'test all, by string LIKE case-insensitive bool': function (next) {
    Zooby.all({foo: {'like': 'b'}}, {lowercase: true}, function (err, data) {
      if (err) {
        throw err;
      }
      assert.equal(data.length, 2);
      next();
    });
  }

, 'test all, by LIKE case-insensitive array': function (next) {
    Zooby.all({foo: {'like': 'b'}}, {lowercase: ['foo']}, function (err, data) {
      if (err) {
        throw err;
      }
      assert.equal(data.length, 2);
      next();
    });
  }

, 'test all, sort string column name': function (next) {
    Zooby.all({}, {sort: 'zong'}, function (err, data) {
      if (err) {
        throw err;
      }
      next();
    });
  }

, 'test all, sort incorrect string column name': function () {
    assert.throws(function () {
      Zooby.all({}, {sort: 'zongX'}, function (err, data) {
      });
    }, Error);
  }

, 'test all, sort array column names': function (next) {
    Zooby.all({}, {sort: ['foo', 'zong']}, function (err, data) {
      // Should be sorted BAR, BAZ, FOO
      assert.equal(data[0].id, testItems[1].id);
      if (err) {
        throw err;
      }
      next();
    });
  }

, 'test all, sort object literal desc': function (next) {
    Zooby.all({}, {sort: {zong: 'desc'}}, function (err, data) {
      // Sort by datetime
      assert.equal(data[0].id, testItems[0].id);
      if (err) {
        throw err;
      }
      next();
    });
  }

, 'test all, sort object literal asc': function (next) {
    Zooby.all({}, {sort: {zong: 'asc'}}, function (err, data) {
      // Sort by datetime reversed
      assert.equal(data[0].id, testItems[2].id);
      if (err) {
        throw err;
      }
      next();
    });
  }

, 'test all, sort incorrect sort direction': function () {
    assert.throws(function () {
      Zooby.all({}, {sort: {foo: 'asc', bar: 'descX'}}, function (err, data) {
      });
    }, Error);
  }

, 'test all, using or, simple equality': function (next) {
    Zooby.all({or: [{foo: 'BAR'}, {foo: 'BAZ'}]}, {}, function (err, data) {
      assert.equal(data.length, 2);
      if (err) {
        throw err;
      }
      next();
    });
  }

, 'test all, using or, like comparison': function (next) {
    Zooby.all({or: [{foo: {'like': 'b'}}, {foo: 'foo'}]}, {lowercase: ['foo']},
        function (err, data) {
      assert.equal(data.length, 3);
      if (err) {
        throw err;
      }
      next();
    });
  }

, 'test all, using or, like comparison with not': function (next) {
    Zooby.all({or: [{foo: {'like': 'b'}}, {foo: 'foo'}], not: {foo: 'baz'}},
        {lowercase: ['foo']}, function (err, data) {
      assert.equal(data.length, 2);
      if (err) {
        throw err;
      }
      next();
    });
  }

, 'test all, using less-than createdAt': function (next) {
    Zooby.all({createdAt: {lt: new Date()}},
        {}, function (err, data) {
      assert.equal(data.length, 3);
      if (err) {
        throw err;
      }
      next();
    });
  }

};

module.exports = tests;

var utils = require('utilities')
  , assert = require('assert')
  , currentId
  , currentDateProp
  , tests
  , testItems
  , Zooby = require('../../fixtures/zooby').Zooby
  , User = require('../../fixtures/user').User
  , Profile = require('../../fixtures/profile').Profile
  , Account = require('../../fixtures/account').Account
  , Team = require('../../fixtures/team').Team
  , Membership = require('../../fixtures/membership').Membership;

tests = {

  'test save new, string UUID id, required nunmber is 0': function (next) {
    var z = Zooby.create({
      foo: 'GROO'
    , zong: new Date()
    , mar: 0
    });
    if (z.isValid()) {
      z.save(function (err, data) {
        if (err) {
          throw err;
        }
        next();
      });
    }
    else {
      throw new Error('model is not valid');
    }
  }

, 'test save new, string UUID id, required number is 1': function (next) {
    currentDateProp = new Date();
    var z = Zooby.create({
      foo: 'ZOO'
    , zong: currentDateProp
    , mar: 1
    });
    if (z.isValid()) {
      z.save(function (err, data) {
        if (err) {
          throw err;
        }
        currentId = z.id;
        next();
      });
    }
    else {
      throw new Error('model is not valid');
    }
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

, 'test datetime round-trip': function (next) {
    Zooby.first(currentId, {}, function (err, data) {
      if (err) {
        throw err;
      }
      assert.equal(data.zong.getTime(), currentDateProp.getTime());
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
        foo: 'ZZZ'
      });
      inst.save(function (err, data) {
        if (err) {
          throw err;
        }
        Zooby.first(currentId, {}, function (err, data) {
          if (err) {
            throw err;
          }
          assert.ok(data);
          assert.equal(data.foo, 'ZZZ');
          next();
        });
      });
    });
  }

, 'test save collection': function (next) {
    var dt = new Date();
    testItems = [];
    testItems.push(Zooby.create({
      foo: 'FOO'
    , zong: utils.date.add(dt, 'day', -1)
    , mar: 1
    }));
    testItems.push(Zooby.create({
      foo: 'BAR'
    , zong: utils.date.add(dt, 'day', -2)
    , mar: 1
    }));
    testItems.push(Zooby.create({
      foo: 'BAZ'
    , zong: utils.date.add(dt, 'day', -3)
    , mar: 1
    }));
    Zooby.save(testItems, function (err, data) {
      if (err) {
        throw err;
      }
      next();
    });
  }

, 'single-quote in string property': function (next) {
    var z = Zooby.create({
          foo: "QUX's awesome Zooby"
        , zong: new Date()
        , mar: 0
        });
    z.save(function (err, data) {
      var id;
      if (err) {
        throw err;
      }
      id = data.id;
      Zooby.first({foo: "QUX's awesome Zooby"}, function (err, data) {
        if (err) {
          throw err;
        }
        assert.equal(id, data.id);
        Zooby.remove({id: id}, function (err, data) {
          if (err) {
            throw err;
          }
          next();
        });
      });
    });
  }

, 'test all, by string equality': function (next) {
    Zooby.all({foo: 'FOO'}, {}, function (err, data) {
      if (err) {
        throw err;
      }
      assert.equal(1, data.length);
      assert.equal(testItems[0].foo, data[0].foo);
      next();
    });
  }

, 'test all, by string case-insensitive bool': function (next) {
    Zooby.all({foo:'BAR'}, {nocase: true}, function (err, data) {
      if (err) {
        throw err;
      }
      assert.equal(data.length, 1);
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
    Zooby.all({foo: {'like': 'b'}}, {nocase: true}, function (err, data) {
      if (err) {
        throw err;
      }
      assert.equal(data.length, 2);
      next();
    });
  }

, 'test all, by LIKE case-insensitive array': function (next) {
    Zooby.all({foo: {'like': 'b'}}, {nocase: ['foo']}, function (err, data) {
      if (err) {
        throw err;
      }
      assert.equal(data.length, 2);
      next();
    });
  }

, 'test all, by IN': function (next) {
    Zooby.all({foo: {'in': ['BAR', 'BAZ']}}, function (err, data) {
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
      if (err) {
        throw err;
      }
      // Should be BAR, BAZ, FOO, ZZZ
      assert.equal(data[0].id, testItems[1].id);
      next();
    });
  }

, 'test all, sort object literal desc': function (next) {
    Zooby.all({}, {sort: {zong: 'desc'}}, function (err, data) {
      if (err) {
        throw err;
      }
      // Should be sorted ZZZ, FOO, BAR, BAZ
      // Sort by datetime
      assert.equal(data[0].id, currentId);
      next();
    });
  }

, 'test all, sort object literal asc': function (next) {
    Zooby.all({}, {sort: {zong: 'asc'}}, function (err, data) {
      if (err) {
        throw err;
      }
      // Sort by datetime reversed
      assert.equal(data[0].id, testItems[2].id);
      next();
    });
  }

, 'test all, sort incorrect sort direction': function () {
    assert.throws(function () {
      Zooby.all({}, {sort: {foo: 'asc', bar: 'descX'}}, function (err, data) {
      });
    }, Error);
  }

, 'test all, sort object literal desc, limit 2': function (next) {
    Zooby.all({}, {sort: {zong: 'desc'}, limit: 2}, function (err, data) {
      if (err) {
        throw err;
      }
      // Should be sorted ZZZ, FOO, BAR, BAZ
      // Sort by datetime
      assert.equal(data[0].id, currentId);
      assert.equal(2, data.length);
      next();
    });
  }

, 'test all, using or, simple equality': function (next) {
    Zooby.all({or: [{foo: 'BAR'}, {foo: 'BAZ'}]}, {}, function (err, data) {
      assert.equal(2, data.length);
      if (err) {
        throw err;
      }
      next();
    });
  }

, 'test all, using or, simple equality on id field': function (next) {
    Zooby.all({or: [
      {id: testItems[0].id}
    , {id: testItems[1].id}
    , {id:testItems[2].id}
    ]}, {}, function (err, data) {
    if (err) {
      throw err;
    }

    assert.equal(3, data.length);
      next();
    });
  }

, 'test all, using or, like comparison': function (next) {
    Zooby.all({or: [{foo: {'like': 'b'}}, {foo: 'foo'}]}, {nocase: ['foo']},
        function (err, data) {
      assert.equal(3, data.length);
      if (err) {
        throw err;
      }
      next();
    });
  }

, 'test all, using or, like comparison with not': function (next) {
    Zooby.all({or: [{foo: {'like': 'b'}}, {foo: 'foo'}], not: {foo: 'baz'}},
        {nocase: ['foo']}, function (err, data) {
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
      assert.equal(data.length, 5);
      if (err) {
        throw err;
      }
      next();
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

, 'test remove collection': function (next) {
    Zooby.remove({id: [
      testItems[0].id
    , testItems[1].id
    , testItems[2].id
    ]}, {}, function (err, data) {
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

, 'test hasOne association': function (next) {
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

, 'test belongsTo association': function (next) {
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
          profile.getUser(function (err, data) {
            assert.equal('asdf', data.login);
            if (err) {
              throw err;
            }
            next();
          });
        });
      });
    });
  }

, 'test hasMany association': function (next) {
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

, 'test named hasMany': function (next) {
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
        user.addKid(User.create({
          login: 'qwer'
        , password: 'zerb'
        , confirmPassword: 'zerb'
        }));
        user.addKid(User.create({
          login: 'zxcv'
        , password: 'zerb'
        , confirmPassword: 'zerb'
        }));
        user.save(function (err, data) {
          if (err) {
            throw err;
          }
          user.getKids(function (err, data) {
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

, 'test named hasMany with hasOne of same model': function (next) {
    var u = User.create({
      login: 'zzzz'
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
        user.setProfile(Profile.create({
          nickname: 'frang'
        }));
        user.addAvatar(Profile.create({
          nickname: 'fffuuu'
        }));
        user.addAvatar(Profile.create({
          nickname: 'derrrr'
        }));
        user.save(function (err, data) {
          if (err) {
            throw err;
          }
          user.getAvatars(function (err, data) {
            if (err) {
              throw err;
            }
            assert.equal(2, data.length);
            user.getProfile(function (err, data) {
              if (err) {
                throw err;
              }
              assert.equal('frang', data.nickname);
              next();
            });
          });
        });
      });
    });
  }

, 'test Static methods on model': function (next) {
    User.findByLogin('asdf', function (err, data) {
      assert.equal(data.length, 4);
      if (err) {
        throw err;
      }
      next();
    });
  }

, 'test save new with custom string id': function (next) {
    var z = Zooby.create({
      id: 'customid'
    , foo: 'ZOO'
    , zong: new Date()
    , mar: 1
    });
    if(z.isValid()) {
      z.save(function (err, data) {
        if (err) {
          throw err;
        }
        assert.equal(data.id, 'customid');
        next();
      });
    } 
    else {
      throw new Error('model is not valid');
    }
  }

, 'test save new with custom int id': function (next) {
    var z = Zooby.create({
      id: 42
    ,  foo: 'ZOO'
    , zong: new Date()
    , mar: 1
    });
    if (z.isValid()) {
      z.save(function (err, data) {
        if (err) {
          throw err;
        }
        assert.equal(data.id, 42);
        next();
      });
    }
    else {
      throw new Error('model is not valid');
    }
  }

};

module.exports = tests;

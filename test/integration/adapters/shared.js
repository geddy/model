var utils = require('utilities')
  , assert = require('assert')
  , model = require('../../../lib')
  , helpers = require('./helpers')
  , currentId
  , currentDateProp
  , tests
  , testItems

  // Old fixtures
  , Zooby = require('../../fixtures/zooby').Zooby
  , User = require('../../fixtures/user').User
  , Profile = require('../../fixtures/profile').Profile
  , Account = require('../../fixtures/account').Account
  , Team = require('../../fixtures/team').Team
  , Membership = require('../../fixtures/membership').Membership;

// Import the model description for each fixture
helpers.fixtures.forEach(function (f) {
  model[f] = require('../../fixtures/' + f.toLowerCase())[f];
});


tests = {

  'beforeEach': function (next) {
    var timeout = model.currentTestAdapter == 'riak' ? 500 : 0;
    helpers.createFixtures(function () {
      setTimeout(next, timeout);
    });
  }

, 'afterEach': function (next) {
    var timeout = model.currentTestAdapter == 'riak' ? 500 : 0;
    helpers.deleteFixtures(function () {
      setTimeout(next, timeout);
    });
  }

, 'test first via string id': function (next) {
    model.Person.all(function (err, data) {
      if (err) { throw err; }
      var id = data[0].id
        , title = data[0].title;
      model.Person.first(id, function (err, data) {
        if (err) { throw err; }
        assert.equal(title, data.title);
        next();
      });
    });
  }

, 'test first via id in query object': function (next) {
    model.Person.all(function (err, data) {
      if (err) { throw err; }
      var id = data[0].id
        , title = data[0].title;
      model.Person.first({id: id}, function (err, data) {
        if (err) { throw err; }
        assert.equal(title, data.title);
        next();
      });
    });
  }

, 'test all via id in query object': function (next) {
    model.Person.all(function (err, data) {
      if (err) { throw err; }
      var id = data[0].id
        , title = data[0].title;
      model.Person.all({id: id}, function (err, data) {
        if (err) { throw err; }
        assert.equal(title, data[0].title);
        next();
      });
    });
  }

, 'test all via list of ids in query object': function (next) {
    model.Person.all({}, {sort: 'title'}, function (err, origData) {
      if (err) { throw err; }
      var ids = origData.map(function (item) {
        return item.id;
      });
      model.Person.all({id: ids}, {sort: 'title'}, function (err, data) {
        if (err) { throw err; }
        for (var i = 0, ii = data.length; i < ii; i++) {
          assert.equal(origData[i].title, data[i].title);
        }
        next();
      });
    });
  }

, 'test datetime round-trip': function (next) {
    var dt = new Date()
      , photo = model.Photo.create({
          takenAt: dt
        });
    photo.save(function (err, data) {
      if (err) { throw err; }
      model.Photo.first({id: data.id}, function (err, data) {
        if (err) { throw err; }
        assert.equal(dt.getTime(), data.takenAt.getTime());
        next();
      });
    });
  }

, 'test updateProperties without save does not affect datastore': function (next) {
    model.Person.all({}, {sort: 'title'}, function (err, data) {
      if (err) { throw err; }
      var id = data[0].id
        , title = data[0].title;
      data[0].updateProperties({title: 'zerb'});
      model.Person.first({id: id}, function (err, data) {
        if (err) { throw err; }
        assert.equal(title, data.title);
        next();
      });
    });
  }

, 'test save existing': function (next) {
    model.Person.all({}, {sort: 'title'}, function (err, data) {
      if (err) { throw err; }
      var id = data[0].id
        , title = 'zerb';
      data[0].updateProperties({title: title});
      data[0].save(function (err, data) {
        if (err) { throw err; }
        assert.equal(title, data.title);
        model.Person.first({id: id}, function (err, data) {
          if (err) { throw err; }
          assert.equal(title, data.title);
          next();
        });
      });
    });
  }

, 'test save collection': function (next) {
    var P = model.Person
      , items = [];
    items.push(P.create({}));
    items.push(P.create({}));
    items.push(P.create({}));
    items.push(P.create({}));
    P.save(items, function (err, data) {
      if (err) { throw err; }
      P.all(function (err, data) {
        if (err) { throw err; }
        assert.equal(24, data.length);
        next();
      });
    });
  }

, 'single-quote in string property': function (next) {
    var title = "Fonebone's shoes"
      , p = model.Person.create({
          title: title
        });
    p.save(function (err, data) {
      if (err) { throw err; }
      model.Person.first({id: data.id}, function (err, data) {
        if (err) { throw err; }
        assert.equal(title, data.title);
        next();
      });
    });
  }

, 'test all, by string equality': function (next) {
    model.Person.all({title: 'a'}, {}, function (err, data) {
      if (err) { throw err; }
      assert.equal(1, data.length);
      next();
    });
  }

, 'test all, id does not override other conditions': function (next) {
    model.Person.all({title: 'a'}, {}, function (err, data) {
      if (err) { throw err; }
      assert.equal(1, data.length);
      model.Person.all({id: data.id, title: 'b'}, function (err, data) {
        if (err) { throw err; }
        // `all` call, no items in the collection
        assert.equal(0, data.length);
        model.Person.first({id: data.id, title: 'b'}, function (err, data) {
          if (err) { throw err; }
          // `first` call, no data at all
          assert.ok(!data);
          next();
        });
      });
    });
  }

, 'test all, by string with metacharacters equality': function (next) {
    model.Person.all({title: '.*'}, {nocase: true}, function (err, data) {
      if (err) { throw err; }
      assert.equal(0, data.length);
      next();
    });
  }

, 'test all, by string case-insensitive bool': function (next) {
    model.Person.all({title: 'A'}, {nocase: true}, function (err, data) {
      if (err) { throw err; }
      assert.equal(1, data.length);
      next();
    });
  }

, 'test all, by string LIKE case-sensitive': function (next) {
    model.Person.all({title: {'like': 'B'}}, function (err, data) {
      if (err) { throw err; }
      assert.equal(0, data.length);
      next();
    });
  }

, 'test all, by string LIKE case-insensitive bool': function (next) {
    model.Person.all({title: {'like': 'B'}}, {nocase: true}, function (err, data) {
      if (err) { throw err; }
      assert.equal(1, data.length);
      next();
    });
  }

, 'test all, by string LIKE case-insensitive array': function (next) {
    model.Person.all({title: {'like': 'B'}}, {nocase: ['title']}, function (err, data) {
      if (err) { throw err; }
      assert.equal(1, data.length);
      next();
    });
  }

, 'test all, by string LIKE percent in front': function (next) {
    var p = model.Person.create({title: 'ZZZ'});
    p.save(function (err, data) {
      if (err) { throw err; }
      model.Person.all({title: {'like': '%ZZ'}}, function (err, data) {
        if (err) { throw err; }
        assert.equal(1, data.length);
        next();
      });
    });
  }

, 'test all, by string LIKE percent in back': function (next) {
    var p = model.Person.create({title: 'ZZZ'});
    p.save(function (err, data) {
      if (err) { throw err; }
      model.Person.all({title: {'like': 'ZZ%'}}, function (err, data) {
        if (err) { throw err; }
        assert.equal(1, data.length);
        next();
      });
    });
  }

, 'test all, by string LIKE percent in front and back': function (next) {
    var p = model.Person.create({title: 'ZZZ'});
    p.save(function (err, data) {
      if (err) { throw err; }
      model.Person.all({title: {'like': '%Z%'}}, function (err, data) {
        if (err) { throw err; }
        assert.equal(1, data.length);
        next();
      });
    });
  }

, 'test all, by string LIKE percent in front, case-insensitive': function (next) {
    var p = model.Person.create({title: 'ZZZ'});
    p.save(function (err, data) {
      if (err) { throw err; }
      model.Person.all({title: {'like': '%zz'}}, {nocase: true}, function (err, data) {
        if (err) { throw err; }
        assert.equal(1, data.length);
        next();
      });
    });
  }

, 'test all, by string LIKE percent in back, case-insensitive': function (next) {
    var p = model.Person.create({title: 'ZZZ'});
    p.save(function (err, data) {
      if (err) { throw err; }
      model.Person.all({title: {'like': 'zz%'}}, {nocase: true}, function (err, data) {
        if (err) { throw err; }
        assert.equal(1, data.length);
        next();
      });
    });
  }

, 'test all, by string LIKE percent in front and back, case-insensitive': function (next) {
    var p = model.Person.create({title: 'ZZZ'});
    p.save(function (err, data) {
      if (err) { throw err; }
      model.Person.all({title: {'like': '%z%'}}, {nocase: true}, function (err, data) {
        if (err) { throw err; }
        assert.equal(1, data.length);
        next();
      });
    });
  }

, 'test all, by IN': function (next) {
    model.Person.all({title: {'in': ['a', 'b']}}, function (err, data) {
      if (err) { throw err; }
      assert.equal(2, data.length);
      next();
    });
  }

, 'test all, sort string column name': function (next) {
    model.Person.all({}, {sort: 'title'}, function (err, data) {
      if (err) { throw err; }
      assert.ok(!(data.some(helpers.foundOutOfOrderItemAscending, data)));
      next();
    });
  }

, 'test all, sort incorrect string column name': function () {
    assert.throws(function () {
      model.Person.all({}, {sort: 'asdf'}, function (err, data) {
      });
    }, Error);
  }

, 'test all, sort multiple columns in array': function (next) {
    var people = [];
    // Add some other people with an 'a' title, and sortable descriptions
    people.push(model.Person.create({
      title: 'a'
    , description: 'r'
    }));
    people.push(model.Person.create({
      title: 'a'
    , description: 's'
    }));
    model.Person.save(people, function (err, data) {
      if (err) { throw err; }
      model.Person.all({}, {sort: ['title', 'description']},
          function (err, data) {
        if (err) { throw err; }
        assert.equal('a', data[0].title);
        assert.equal('t', data[data.length - 1].title);
        assert.equal('r', data[0].description);
        assert.equal('s', data[1].description);
        assert.equal('t', data[2].description);
        next();
      });
    });
  }

, 'test all, sort object literal asc': function (next) {
    model.Person.all({}, {sort: {title: 'asc'}}, function (err, data) {
      if (err) { throw err; }
      assert.ok(!(data.some(helpers.foundOutOfOrderItemAscending, data)));
      next();
    });
  }

, 'test all, sort object literal desc': function (next) {
    model.Person.all({}, {sort: {title: 'desc'}}, function (err, data) {
      if (err) { throw err; }
      assert.ok(!(data.some(helpers.foundOutOfOrderItemDescending, data)));
      next();
    });
  }

, 'test all, sort incorrect sort direction': function () {
    assert.throws(function () {
    model.Person.all({}, {sort: {title: 'descX'}}, function (err, data) {
      next();
    });
    }, Error);
  }

, 'test all, sort string wtih limit': function (next) {
    model.Person.all({}, {sort: 'title', limit: 4}, function (err, data) {
      if (err) { throw err; }
      assert.ok(!(data.some(helpers.foundOutOfOrderItemAscending, data)));
      assert.equal(4, data.length);
      next();
    });
  }

, 'test all, sort object literal wtih limit': function (next) {
    model.Person.all({}, {sort: {title: 'asc'}, limit: 4}, function (err, data) {
      if (err) { throw err; }
      assert.ok(!(data.some(helpers.foundOutOfOrderItemAscending, data)));
      assert.equal(4, data.length);
      next();
    });
  }

, 'test all, simple equality with or': function (next) {
    model.Person.all({or: [{title: 'a'}, {title: 't'}]}, {}, function (err, data) {
      if (err) { throw err; }
      assert.equal(2, data.length);
      next();
    });
  }

, 'test all, simple equality with or on an id property': function (next) {
    model.Person.all(function (err, data) {
      if (err) { throw err; }
      var idMap = {}
        , ids = data.slice(0, 3).map(function (item) {
            idMap[item.id] = true;
            return {id: item.id}
          });
      model.Person.all({or: ids}, function (err, data) {
        if (err) { throw err; }
        assert.ok(data.every(function (item) {
          return idMap[item.id];
        }));
        next();
      });

    });
  }

, 'test all, or with simple equality and like comparison': function (next) {
    var p = model.Person.create({title: 'zzz'});
    p.save(function (err, data) {
      if (err) { throw err; }
      model.Person.all({or: [{title: {'like': 'z%'}}, {title: 'a'}]},
          function (err, data) {
        if (err) { throw err; }
        assert.equal(2, data.length);
        next();
      });
    });
  }

, 'test all, or with simple equality and like comparison, and not': function (next) {
    var p = model.Person.create({title: 'aaa'});
    p.save(function (err, data) {
      if (err) { throw err; }
      model.Person.all({or: [{title: {'like': 'a%'}}, {title: 'b'}],
          not: {title: 'a'}}, function (err, data) {
        if (err) { throw err; }
        assert.equal(2, data.length);
        next();
      });
    });
  }


, 'test all, using less-than createdAt': function (next) {
    var dt, p;
    setTimeout(function () {
      p = model.Photo.create({title: 'z'});
      p.save(function (err, data) {
        if (err) { throw err; }
        model.Person.all({createdAt: {lt: data.createdAt}},
            function (err, data) {
          if (err) { throw err; }
          assert.equal(20, data.length);
          next();
        });
      });

    }, 10);
  }

, 'test remove': function (next) {
    model.Person.all(function (err, data) {
      if (err) { throw err; }
      var id = data[0].id;
      model.Person.remove({id: id}, function (err, data) {
        if (err) { throw err; }
        model.Person.first(id, function (err, data) {
          if (err) { throw err; }
          assert.ok(!data);
          next();
        });
      });
    });
  }

/*

, 'test remove collection': function (next) {
    model.Person.all(function (err, data) {
      if (err) { throw err; }
      var ids = data.slice(0, 3).map(function (item) {
        return item.id;
      });
      model.Person.remove({id: ids}, function (err, data) {
        if (err) { throw err; }
        model.Person.all({id: ids}, function (err, data) {
          if (err) { throw err; }
          assert.equal(0, data.length);
          next();
        });
      });
    });
  }

, 'test reification of invalid model': function (next) {
    var u = User.create({
      login: 'asdf'
      // Invalid model as confirmPassword should fail
    });
    u.save({force: true}, function (err, data) {
      if (err) {
        throw err;
      }
      currentId = u.id;

      // Fetch the invalid model
      User.first(currentId, {}, function (err, data) {
        // Ensure that reification worked
        assert.ok(typeof data.toJSON === 'function');

        // Since confirmPassword should only trigger on 'create', ensure that there were no errors
        assert.ok(!err);

        // Cleanup
        User.remove(data.id, next);
      });
    });
  }

, 'test validations on reification': function (next) {
    var u = User.create({
      login: 'as' // Too short, will cause validation error on reify
      // Invalid model as confirmPassword should fail
    });
    u.save({force: true}, function (err, data) {
      if (err) {
        throw err;
      }
      currentId = data.id;

      // Fetch the invalid model
      User.first(currentId, {}, function (err, data) {
        // Ensure that reification worked
        assert.ok(typeof data.toJSON === 'function');

        // Ensure that we get an error
        assert.ok(typeof data.errors.login !== 'undefined');
        assert.ok(typeof data.errors.password !== 'undefined');

        // Cleanup
        User.remove(data.id, next);
      });
    });
  }

, 'test validations on fetch with scenario': function (next) {
    var u = User.create({
      login: 'as' // Too short, will cause validation error on reify
      // Invalid model as confirmPassword should fail
    });
    u.save({force: true}, function (err, data) {
      if (err) {
        throw err;
      }
      currentId = data.id;

      // Fetch the invalid model
      User.first(currentId, {scenario: 'update'}, function (err, data) {
        // Ensure that reification worked
        assert.ok(typeof data.toJSON === 'function');

        // Ensure that we get errors about the password, but not the login
        assert.ok(!data.errors.login);
        assert.ok(typeof data.errors.password !== 'undefined');

        // Cleanup
        User.remove(data.id, next);
      });
    });
  }

, 'test hasOne association': function (next) {
    var u = User.create({
      login: 'asdf'
    , password: 'zerb1'
    , confirmPassword: 'zerb1'
    });
    u.save(function (err, data) {
      if (err) {
        throw err;
      }
      currentId = data.id;
      User.first(currentId, {}, function (err, data) {
        var user = data
          , profile;
        if (err) {
          throw err;
        }
        profile = Profile.create({});
        user.setProfile(profile);
        user.save(function (err, data) {
          assert.ok(!err, err);

          user.getProfile(function (err, data) {
            assert.ok(!err, err);
            assert.equal(profile.id, data.id);
            next();
          });
        });
      });
    });
  }

, 'test belongsTo association': function (next) {
    var u = User.create({
      login: 'asdf'
    , password: 'zerb2'
    , confirmPassword: 'zerb2'
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
    , password: 'zerb3'
    , confirmPassword: 'zerb3'
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
    , password: 'zerb4'
    , confirmPassword: 'zerb4'
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
        , password: 'zerb1'
        , confirmPassword: 'zerb1'
        }));
        user.addKid(User.create({
          login: 'zxcv'
        , password: 'zerb2'
        , confirmPassword: 'zerb2'
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
    , password: 'zerb5'
    , confirmPassword: 'zerb5'
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
        user.addAvatarProfile(Profile.create({
          nickname: 'fffuuu'
        }));
        user.addAvatarProfile(Profile.create({
          nickname: 'derrrr'
        }));
        user.save(function (err, data) {
          if (err) {
            throw err;
          }
          user.getAvatarProfiles(function (err, data) {
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

*/
};

module.exports = tests;

var utils = require('utilities')
  , model = require('../../../lib')
  , Adapter = require('../../../lib/adapters/riak').Adapter
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
  'before': function () {
    adapter = new Adapter();

    model.adapters = {
      'Zooby': adapter
    , 'User': adapter
    , 'Profile': adapter
    , 'Account': adapter
    };
  }

, 'test create adapter': function () {
    assert.ok(adapter instanceof Adapter);
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
      assert.equal(currentId, data.id);
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
          assert.equal('BAR', data.foo);
          next();
        });
      });
    });
  }

, 'test all, by id': function (next) {
    Zooby.all({id: currentId}, {}, function (err, data) {
      if (err) {
        throw err;
      }
      assert.equal(currentId, data[0].id);
      next();
    });
  }

, 'test all, by map-reduce': function (next) {
    Zooby.all({foo: 'BAR'}, {}, function (err, data) {
      if (err) {
        throw err;
      }
      assert.equal(data[0].id, currentId);
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

};

module.exports = tests;

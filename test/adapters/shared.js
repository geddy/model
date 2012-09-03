var utils = require('utilities')
  , assert = require('assert')
  , currentId
  , tests
  , testItems = []
  , Zooby = require('../fixtures/zooby').Zooby
  , User = require('../fixtures/user').User
  , Profile = require('../fixtures/profile').Profile
  , Account = require('../fixtures/account').Account;

tests = {

  'test save new, string UUID id': function (next) {
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

/*
, 'test all, sort object literal desc': function (next) {
    Zooby.all({}, {sort: {zong: 'desc'}}, function (err, data) {
      // Sort by datetime
      assert.equal(data[0].id, currentId);
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

*/
, 'test all, sort incorrect sort direction': function () {
    assert.throws(function () {
      Zooby.all({}, {sort: {foo: 'asc', bar: 'descX'}}, function (err, data) {
      });
    }, Error);
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
      assert.equal(data.length, 4);
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

};

module.exports = tests;

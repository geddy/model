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
  , Zooby = require('../../fixtures/zooby').Zooby;

tests = {
  'before': function (next) {
    var sql;

    adapter = new Adapter({
      database: 'model_test'
    , autoConnect: false
    });
    sql = generator.createTable(['Zooby']);
    adapter.once('connect', function () {
      var sql = generator.createTable(['Zooby']);
      adapter.exec(sql, function (err, data) {
        if (err) {
          throw err;
        }
        next();
      });
    });
    adapter.connect();

    model.adapter = {
      'Zooby': adapter
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
    var z = Zooby.create({foo: 'FOO'});
    z.save(function (err, data) {
      if (err) {
        throw err;
      }
      currentId = z.id;
      next();
    });
  }

, 'test load via id': function (next) {
    Zooby.load(currentId, {}, function (err, data) {
      if (err) {
        throw err;
      }
      assert.equal(data[0].id, currentId);
      next();
    });
  }

// TODO: Load via array of ids

, 'test load via object': function (next) {
    Zooby.load({id: currentId}, {}, function (err, data) {
      if (err) {
        throw err;
      }
      assert.equal(data[0].id, currentId);
      next();
    });
  }

, 'test save existing': function (next) {
    Zooby.load({id: currentId}, {}, function (err, data) {
      var inst = data[0];
      inst.foo = 'BAR';
      inst.save(function (err, data) {
        if (err) {
          throw err;
        }
        Zooby.load({id: currentId}, {}, function (err, data) {
          if (err) {
            throw err;
          }
          assert.equal(data[0].foo, 'BAR');
          next();
        });
      });
    });
  }

, 'test remove': function (next) {
    Zooby.remove({id: currentId}, {}, function (err, data) {
      if (err) {
        throw err;
      }
      Zooby.load({id: currentId}, {}, function (err, data) {
        if (err) {
          throw err;
        }
        assert.equal(data.length, 0);
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

, 'test all by string equality': function (next) {
    Zooby.all({foo: 'FOO'}, {}, function (err, data) {
      if (err) {
        throw err;
      }
      assert.equal(data.length, 1);
      assert.equal(testItems[0].foo, data[0].foo);
      next();
    });
  }

, 'test all by string LIKE case-sensitive': function (next) {
    Zooby.all({foo: {'like': 'B'}}, {}, function (err, data) {
      if (err) {
        throw err;
      }
      assert.equal(data.length, 2);
      next();
    });
  }

, 'test all by string LIKE case-insensitive bool': function (next) {
    Zooby.all({foo: {'like': 'b'}}, {lowercase: true}, function (err, data) {
      if (err) {
        throw err;
      }
      assert.equal(data.length, 2);
      next();
    });
  }

, 'test all by LIKE case-insensitive array': function (next) {
    Zooby.all({foo: {'like': 'b'}}, {lowercase: ['foo']}, function (err, data) {
      if (err) {
        throw err;
      }
      assert.equal(data.length, 2);
      next();
    });
  }

, 'test all sort string column name': function (next) {
    Zooby.all({}, {sort: 'zong'}, function (err, data) {
      if (err) {
        throw err;
      }
      next();
    });
  }

, 'test all sort incorrect string column name': function () {
    assert.throws(function () {
      Zooby.all({}, {sort: 'zongX'}, function (err, data) {
      });
    }, Error);
  }

, 'test all sort array column names': function (next) {
    Zooby.all({}, {sort: ['foo', 'zong']}, function (err, data) {
      // Should be sorted BAR, BAZ, FOO
      assert.equal(data[0].id, testItems[1].id);
      if (err) {
        throw err;
      }
      next();
    });
  }

, 'test all sort object literal desc': function (next) {
    Zooby.all({}, {sort: {zong: 'desc'}}, function (err, data) {
      // Sort by datetime
      assert.equal(data[0].id, testItems[0].id);
      if (err) {
        throw err;
      }
      next();
    });
  }

, 'test all sort object literal asc': function (next) {
    Zooby.all({}, {sort: {zong: 'asc'}}, function (err, data) {
      // Sort by datetime reversed
      assert.equal(data[0].id, testItems[2].id);
      if (err) {
        throw err;
      }
      next();
    });
  }

, 'test all sort incorrect sort direction': function () {
    assert.throws(function () {
      Zooby.all({}, {sort: {foo: 'asc', bar: 'descX'}}, function (err, data) {
      });
    }, Error);
  }

};

module.exports = tests;

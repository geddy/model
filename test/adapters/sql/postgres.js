
var Adapter = require('../../../lib/adapters/sql/postgres').Adapter
  , Query = require('../../../lib/query/query').Query
  , Zooby = require('../../fixtures/zooby').Zooby
  , model = require('../../../lib')
  , generator = require('../../../lib/generators/sql')
  , adapter
  , assert = require('assert')
  , currentId
  , tests
  , _runOnce;

tests = {
  'before': function (next) {
    var sql;

    adapter = new Adapter({
      database: 'model_test'
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

};

module.exports = tests;

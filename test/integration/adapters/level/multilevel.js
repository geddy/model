var utils = require('utilities')
  , assert = require('assert')
  , net = require('net')
  , multilevel = require('multilevel')
  , level = require('level')
  , model = require('../../../../lib')
  , helpers = require('.././helpers')
  , Adapter = require('../../../../lib/adapters/level').Adapter
  , adapter
  , tests
  , config = require('../../../config')
  , shared = require('../shared')
  , server
  , db;

tests = {
  'before': function (next) {
    var relations = helpers.fixtures.slice()
      , models = []
      , settings;

    db = new level(config.level.db, {keyEncoding: 'utf8', valueEncoding: 'json'});
    settings = config.multilevel;

    server = net.createServer(function (conn) {
      conn.pipe(multilevel.server(db))
          .pipe(conn);
    });

    server.listen(settings.port, settings.host, function() {

      adapter = new Adapter(settings);

      adapter.once('connect', function () {
        adapter.dropTable(['Zooby', 'User'], next);
      });

      adapter.on('error', function (err) {
        next(err);
      });

      adapter.connect();

      relations.forEach(function (r) {
        models.push({
          ctorName: r.ctorName
        , ctor: r.ctor
        });
      });
      model.clearDefinitions(models);
      model.registerDefinitions(models);
      model.adapters = {};
      relations.forEach(function (r) {
        model[r.ctorName].adapter = adapter;
      });
    });
  }

, 'after': function (next) {
    adapter.dropTable(['Zooby', 'User'], function () {
      adapter.disconnect(function(err) {
        if (err) { throw err; }
        server.close(function () {
          db.close(function () {
            next();
          });
        });
      });
    });
  }

, 'test create adapter': function () {
    assert.ok(adapter instanceof Adapter);
  }


};

for (var p in shared) {
  if (p == 'beforeEach' || p == 'afterEach') {
    tests[p] = shared[p];
  }
  else {
    tests[p + ' (LevelDB/Multilevel)'] = shared[p];
  }
}

module.exports = tests;

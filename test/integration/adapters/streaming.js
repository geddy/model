var utils = require('utilities')
  , assert = require('assert')
  , config = require('../../config')
  , model = require('../../../lib')
  , helpers = require('./helpers')
  , tests;

// Import the model description for each fixture
helpers.fixtures.forEach(function (f) {
  model[f] = require('../../fixtures/' + f.toLowerCase())[f];
});

tests = {
  'test all, data event for each row': function (next) {
    var processor
      , incr = 0;
    processor = model.Person.all();
    processor.on('data', function (item) {
      incr++;
    });
    processor.on('end', function () {
      assert.equal(20, incr);
      next();
    });
  }

, 'test all, no callback when none passed': function (next) {
    var processor
      , incr = 0;
    processor = model.Person.all();
    assert.ok(!processor.callback);
    next();
  }

, 'test all, data events in order': function (next) {
    var processor
      , incr = 0
      , letters = 'abcdefghijklmnopqrst'.split('');
    processor = model.Person.all({}, {sort: 'title'});
    processor.on('data', function (item) {
      assert.equal(letters[incr], item.title);
      incr++;
    });
    processor.on('end', next);
  }

, 'test all, error event': function (next) {
    var processor
      , adapter = model.Person.adapter;

    // Temporarily punch out the exec method to run a
    // query with bad SQL, produce an error
    origExec = adapter.exec;
    adapter.exec = function (sql) {
      return origExec.call(adapter, 'asdf' + sql);
    };

    processor = model.Person.all();
    processor.on('error', function (err) {

      // Important: Put the exec method back where it was
      adapter.exec = origExec;

      assert.ok(err);
      next();
    });
  }

};

module.exports = tests;




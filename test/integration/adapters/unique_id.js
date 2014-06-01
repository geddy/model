var utils = require('utilities')
  , assert = require('assert')
  , config = require('../../config')
  , model = require('../../../lib')
  , tests;


tests = {
  'test id is actually unique': function (next) {
    // Unnecessary with config.autoIncrementId
    if (!model.config.autoIncrementId) {
      model.Person.all(function (err, people) {
        var customId;
        if (err) { throw err; }
        duplicateId = people[0].id;
        var p = model.Person.create({
          id: duplicateId
        });
        // Should throw when trying to save with an already-existing id
        p.save(function (err, data) {
          assert.ok(err);
          next();
        });
      });
    }
    else {
      next();
    }
  }

};

module.exports = tests;



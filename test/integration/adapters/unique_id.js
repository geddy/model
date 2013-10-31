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
  'test id is actually unique': function (next) {
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

};

module.exports = tests;



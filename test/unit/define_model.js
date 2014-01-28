var utils = require('utilities')
  , assert = require('assert')
  , model = require('../../lib')
  , tests;

tests = {
  'define model with reserved system properties': function () {
    // Error message should say something about a reserved system-property name
    assert.throws(function () {
      var Event = function () {
        this.property('type', 'string');
      };
      Event = model.register('Event', Event);
    }, /reserved/);
  }
};

module.exports = tests;


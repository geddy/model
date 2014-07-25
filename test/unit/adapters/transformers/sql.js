var utils = require('utilities')
  , assert = require('assert')
  , tests
  , tfr = require('../../../../lib/adapters/transformers/sql')
  , converter = require('../../../../lib/adapters/sql/converter');

utils.mixin(tfr, converter);

tests = {
  'transform comparison field name': function () {
    var name = tfr.transformComparisonFieldName({
          model: 'User'
        , field: 'foo'
        , opts: {}
        , datatype: 'string'
        });
    assert.equal('"users"."foo"', name);
  }

, 'transform comparison field name, nocase': function () {
    var name = tfr.transformComparisonFieldName({
          model: 'User'
        , field: 'foo'
        , opts: {nocase: true}
        , datatype: 'string'
        });
    assert.equal('LOWER("users"."foo")', name);
  }

};

module.exports = tests;

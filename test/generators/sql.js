
var model = require('../../lib')
  , User = require('../fixtures/user')
  , generator = require('../../lib/generators/sql')
  , tests;

tests = {
  'test run': function () {
    var sql = generator.run(['User', 'ByTor']);
    console.log(sql);
  }
};

module.exports = tests;

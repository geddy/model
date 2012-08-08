var model = require('../lib/model')
  , Query = require('../lib/mapper/query').Query
  , utils = require('utilities')
  , assert = require('assert')
  , User = require('./fixtures/user')
  , tests;

var tests = {
  'test parse': function () {
    var query = new Query(User, {login: 'foo', firstName: null}, {});
    console.log(query.conditions.toString());
  }

};

module.exports = tests;

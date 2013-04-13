
var assert = require('assert')
  , Migration = require('../../lib/migration').Migration
  , utils = require('utilities')
  , tests
  , fakeAdapter = {
      exec: function (sql, cb) {
        cb(null, sql);
      }
    }
  , createCallback = function (next) {
      return function (err, data) {
        console.log(data);
        next();
      };
    };

tests = {

  'createTable': function (next) {
    var m = new Migration(fakeAdapter);
    m.createTable('zerbs', function (t) {
      t.column('fooBarBaz', 'string');
      t.column('bazBarQux', 'int');
      t.column('quxBazBar', 'boolean');
    }, createCallback(next));
  }

};

module.exports = tests;


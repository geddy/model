var utils = require('utilities')
  , common = require('./postgres_common')
  , adapter
  , currentId
  , tests;

tests = {
  'before': function (next) {
    adapter = common.connect(next);
  }

, 'after': function (next) {
    common.disconnect(adapter, next);
  }

};

for (var p in common.tests) {
  if (p == 'beforeEach' || p == 'afterEach') {
    tests[p] = common.tests[p];
  }
  else {
    tests[p + ' (string UUID)'] = common.tests[p];
  }
}

module.exports = tests;

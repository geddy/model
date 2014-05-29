
var model = require('../../../../lib')
  , tests = require('./postgres')
  , autoIncrementTests = {};

model.setAutoIncrementId(true);

for (var p in tests) {
  if (p == 'before' || p == 'after' || p == 'beforeEach' || p == 'afterEach') {
    autoIncrementTests[p] = tests[p];
  }
  else {
    autoIncrementTests[p + ' (auto-increment ID)'] = tests[p];
  }
}

module.exports = autoIncrementTests;

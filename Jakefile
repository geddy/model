
var t = new jake.TestTask('Model', function () {
  // FIXME: These tests fail if run too late
  // This forces them to run first so the tests pass
  this.testFiles.include('test/unit/default_adapter.js');
  this.testFiles.include('test/unit/events.js');
  this.testFiles.include('test/**/*.js');

  // Exclusions
  this.testFiles.exclude('test/fixtures/*.js');
  this.testFiles.exclude('test/integration/adapters/shared.js');
  this.testFiles.exclude('test/integration/adapters/unique_id.js');
  this.testFiles.exclude('test/integration/adapters/streaming.js');
  this.testFiles.exclude('test/integration/adapters/helpers.js');
  this.testFiles.exclude('test/integration/adapters/sql/eager_assn.js');
  this.testFiles.exclude('test/integration/adapters/sql/nested_eager_assn.js');
  this.testFiles.exclude('test/integration/adapters/sql/postgres_common.js');
  this.testFiles.exclude('test/config.js');
  this.testFiles.exclude('test/db.json');
  this.testFiles.exclude('test/db.sample.json');
});

var p = new jake.NpmPublishTask('model', [
  'Jakefile'
, 'README.md'
, 'package.json'
, 'lib/**'
, 'test/**'
]);


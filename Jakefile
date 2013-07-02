
var t = new jake.TestTask('Model', function () {
  // FIXME: Events fail if run after integration tests
  // This line forces them to run first so the tests pass
  this.testFiles.include('test/unit/events.js');
  
  this.testFiles.include('test/*.js');
  this.testFiles.include('test/**/*.js');
  this.testFiles.exclude('test/fixtures/*.js');
  this.testFiles.exclude('test/integration/adapters/shared.js');
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


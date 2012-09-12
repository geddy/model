
var t = new jake.TestTask('Model', function () {
  this.testFiles.include('test/*.js');
  this.testFiles.include('test/**/*.js');
  this.testFiles.exclude('test/fixtures/*.js');
  this.testFiles.exclude('test/adapters/shared.js');
});

var p = new jake.NpmPublishTask('model', [
  'Jakefile'
, 'README.md'
, 'package.json'
, 'lib/**'
, 'test/**'
]);


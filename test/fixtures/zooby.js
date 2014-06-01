var model = require('../../lib');

var Zooby = function () {
  this.property('foo', 'string', {required: true});
  this.property('derf', 'text');
  this.property('mar', 'number', {required:true});
  this.property('bar', 'number');
  this.property('baz', 'int');
  this.property('woot', 'boolean');
  this.property('freen', 'date');
  this.property('zong', 'datetime');
  this.property('blarg', 'time');
  this.property('wooby', 'object');

};

module.exports.Zooby = Zooby;

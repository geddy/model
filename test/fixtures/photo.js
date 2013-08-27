var model = require('../../lib');

var Photo = function () {
  this.property('title', 'string');
  this.property('location', 'string');
};

Photo.prototype.someMethod = function () {
};

Photo = model.register('Photo', Photo);

module.exports.Photo = Photo;




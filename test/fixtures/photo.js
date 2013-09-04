var model = require('../../lib');

var Photo = function () {
  this.property('title', 'string');
  this.property('description', 'text');
  this.property('location', 'string');
  this.property('takenAt', 'datetime');
  this.belongsTo('Event');
};

Photo.prototype.someMethod = function () {
};

Photo = model.register('Photo', Photo);

module.exports.Photo = Photo;




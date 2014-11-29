var model = require('../../lib');

var Message = function () {
  this.property('title', 'string');
  this.property('description', 'text');
  this.property('body', 'text');

  this.belongsTo('Person');
};

Message.prototype.someMethod = function () {
};

module.exports.Message = Message;





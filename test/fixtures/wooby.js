var model = require('../../lib');

var Wooby = function () {
  this.property('foo', 'string');
};

Wooby = model.register('Wooby', Wooby);

module.exports.Wooby = Wooby;

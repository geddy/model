var BaseAdapter
  , EventEmitter = require('events').EventEmitter
  , adapter = require('./index')
  , utils = require('utilities');

BaseAdapter = function () {
};

BaseAdapter.prototype = new EventEmitter();
utils.mixin(BaseAdapter.prototype, new (function () {
})());

module.exports.BaseAdapter = BaseAdapter;

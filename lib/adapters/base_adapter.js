var BaseAdapter
  , EventEmitter = require('events').EventEmitter
  , adapter = require('./index')
  , utils = require('utilities');

BaseAdapter = function () {
};

BaseAdapter.prototype = new EventEmitter();
utils.mixin(BaseAdapter.prototype, new (function () {

  this.getAppConfig = function (dbConfig) {
    var info;
    for (var p in dbConfig) {
      // Return the first alias key recognized whose
      // canonical name is the same
      info = adapter.getAdapterInfo(p);
      if (info && info.name == this.name) {
        return dbConfig[p];
      }
    }
  };

})());

module.exports.BaseAdapter = BaseAdapter;

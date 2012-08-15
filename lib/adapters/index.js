
var adapters
  , path = require('path');

adapters = new (function () {

  this.getAdapterInfo = function (adapter) {
    var ret;
    switch (adapter) {
      case 'postgres':
      case 'postgresql':
      case 'pg':
        ret = {
          name: 'Adapter'
        , filePath: path.join('sql', 'postgres')
        };
        break;
      default:
        ret = null;
    }
    return ret;
  };

})();

module.exports = adapters;

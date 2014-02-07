var utils = require('utilities')
  , model = require('../../index');

module.exports = new (function () {
  this.COLUMN_NAME_DELIMITER = '"';

  /**
   * Get the TableName of the Model. First checks if it
   * was defined on the model, otherwise it performs a pluralization of
   * the model name
   *
   * @param {string} name - the name of the model
   * @returns {model.ModelDescription.tableName|string}
   * @private
   */
  this._tableizeModelName = function (name) {
    // Get the Correct model name (in case the name is passed in with the wrong case)
    var modelName = utils.string.getInflection(name, 'constructor', 'singular');

    return (model.descriptionRegistry[modelName] && model.descriptionRegistry[modelName].tableName)
      || utils.string.getInflection(name, 'filename', 'plural');
  };

  this._modelizeTableName = function (name, ownerName) {
    var modelName
      , ownerModelName;
    modelName = utils.string.getInflection(name, 'constructor', 'singular');
    if (ownerName && name != ownerName) {
      ownerModelName = utils.string.getInflection(ownerName, 'constructor', 'singular');
      modelName = model.getAssociation(ownerModelName, modelName).model;
    }

    return model[modelName] || null;
  };

  this._columnizePropertyName = function (name, options) {
    var delimiter = this.COLUMN_NAME_DELIMITER
      , opts = options || {}
    , columnName = utils.string.snakeize(name)
    , useQuotes = typeof opts.useQuotes != 'undefined' ?
          opts.useQuotes : true;
    if (useQuotes) {
      columnName = delimiter +  columnName + delimiter;
    }
    return columnName;
  };

})();



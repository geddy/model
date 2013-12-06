var association
  , model = require('../index')
  , utils = require('utilities');

association = new (function () {

  this.getThroughAssnKey = function (assn, assnType, modelType, opts) {
    var through = assn.through
      , assns
      , reg = model.descriptionRegistry
      , keyAssn
      , keyName
      , side = opts.side;

    if (side == 'other') {
      if (!assn.inverse) {
        // Look through other associations, find the inverse, and cache
        // for later lookup
        for (var p in reg) {
          assns = reg[p].associations[assnType];
          for (var q in assns) {
            if (q != assn.name && assns[q].through == through) {
              assn.inverse = assns[q];
            }
          }
        }
      }
      if (!assn.inverse) {
        throw new Error('No inverse found for this through-association.');
      }
      keyAssn = assn.inverse;
    }
    else {
      keyAssn = assn;
    }

    if (keyAssn.name != keyAssn.model) {
      keyName = keyAssn.name + keyAssn.model;
    }
    else {
      keyName = keyAssn.name;
    }
    keyName = utils.string.decapitalize(keyName + 'Id');

    return keyName;
  };

})();

module.exports = association;

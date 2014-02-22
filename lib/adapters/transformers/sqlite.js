var SQLTransformer = require('./sql')
  , SQLTransformerTransformComparisonValueProxy = SQLTransformer.transformComparisonValue;

SQLTransformer.transformComparisonValue = function () {
  var ret = SQLTransformerTransformComparisonValueProxy.apply(this, arguments);

  if(ret == 'false')
    ret = '1=0';

  return ret;
};

module.exports = SQLTransformer;

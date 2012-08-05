
var SQLAdapter = function () {

  var quoteName = function (name) {
        return '"' + name.replace(/"/g, '""') + '"';
      }

    , columnsStatement = function (properties, qualify) {
        return properties.map(function (property) {
          return propertyToColumnName(property, qualify);
        }).join(', ');
      }

    , propertyToColumnName = function (property, qualify) {
        columnName = '';
        if (qualify === true) {
          // TODO
        }
        else if (typeof qualify == 'string') {
          columnName += quoteName(qualify);
        }
        columnName += quoteName(property);
        return columnName;
      };

  this.selectStatement = function (query) {
    var qualify = !!query.links.length;
      , fields = query.fields
      , orderBy = query.order
      , conditionsStatement;

    conditionsStatement = this.conditionsStatement(query.conditions);
  };

  this.conditionsStatement = function (conditions) {
    var statement = '';

    switch (true) {
    }
  };
};

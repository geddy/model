var utils = require('utilities')
  , operation = {}
  , OperationBase
  , operationTypes;

operation.create = function () {
  var args = Array.prototype.slice.call(arguments)
    , type = args.shift()
    , ctor = utils.string.capitalize(type) + 'Operation'
    , inst;

    ctor = operationTypes[ctor];
    inst = new ctor();
    inst.type = type;
    inst.initialize.apply(inst, args);
    return inst;
};


OperationBase = function () {

  this.initialize = function () {
    var operands = Array.prototype.slice.call(arguments);

    this.parent = null;
    this.descendants = [];
    this.operands = [];

    this.merge(operands);
  };

  this.forEach = function (f) {
    this.operands.forEach(f);
  };

  this.isEmpty = function () {
    return !this.operands.length;
  };

  this.isValid = function () {
    var self = this;
    return (!this.isEmpty() && this.operands.every(function (op) {
      return self.validOperand(op);
    }));
  };

  this.validOperand = function (op) {
    return typeof op.isValid == 'function' ?
      op.isValid() : true;
  };

  this.add = function (operand) {
    // Flatten if same type, to create a shallower tree
    if (operand.type == this.type) {
      this.merge(operand.operands);
    }
    else {
      this.operands.push(operand);
      operand.parent = this;
    }
  };

  // Can take args or a single array-arg
  this.merge = function (operands) {
    var self = this
      , ops = Array.isArray(operands) ?
        operands : Array.prototype.slice.call(arguments);
    ops.forEach(function (op) {
      self.add(op);
    });
  };

  this.union = function (other) {
    return (create('or', this, other)).minimize();
  };

  this.intersection  = function () {
    return (create('and', this, other)).minimize();
  };

  this.difference = function () {
    return (create('and', this, create('not', other))).minimize();
  };

  this.minimize = function () {
    return this;
  };

  this.clear = function () {
    this.operands = [];
  };

  this.minimizeOperands = function () {
    var self = this;
    this.operands = this.operands.map(function (op) {
      var min = typeof op.minimize == 'function' ?
          op.minimize() : op;
      min.parent = self;
      return min;
    });
  };

  this.pruneOperands = function () {
    this.operands = this.operands.filter(function (op) {
      return typeof op.isEmpty == 'function' ?
        !op.isEmpty() : true;
    });
  };

  // FIXME: Is this needed?
  this.isNull = function () {
    return false;
  };

};

operationTypes = {
  AndOperation: function () {

    this.matches = function (record) {
      return this.operands.every(function (op) {
        return typeof op.matches == 'function' ?
          op.matches(record) : true;
      });
    };

    this.minimize = function () {
      this.minimizeOperands();

      if (!this.isEmpty() && this.operands.every(function (op) {
        return op.isNull();
      })) {
        return create('null');
      }

      this.pruneOperands();

      if (this.operands.length == 1) {
        return this.operands[0];
      }
      return this;
    };
  }

, OrOperation: function () {

    this.matches = function (record) {
      return this.operands.some(function (op) {
        return typeof op.matches == 'function' ?
          op.matches(record) : true;
      });
    }

    this.isValid = function () {
      var self = this;
      return (!this.isEmpty() && this.operands.some(function (op) {
        return self.validOperand(op);
      }));
    };

    this.minimize = function () {
      this.minimizeOperands();

      if (!this.isEmpty() && this.operands.some(function (op) {
        return op.isNull();
      })) {
        return create('null');
      }

      this.pruneOperands();

      if (this.operands.length == 1) {
        return this.operands[0];
      }
      return this;
    };
  }

, NotOperation: function () {
    this.add = function (operand) {
      // Assert there's only one operand
      if (this.operands.length) {
        throw new Error('Not operation can only have one operand.');
      }
      // Assert that the single operand isn't a self-reference
      if (this.operand === this) {
        throw new Error('Operand for Not operation can\'t be a self-reference.');
      }
      this.constructor.prototype.add.apply(this, arguments);
    };

    this.minimize = function () {
      var operand
      this.minimizeOperands();
      this.pruneOperands();
      // Try to factor out double negatives
      operand = this.operand();
      if (operand && operand instanceof operationTypes.NotOperation) {
        return this.operands[0].operand;
      }
      else {
        return this;
      }
    };

    this.operand = function () {
      return this.operands.length == 1 && this.operands[0];
    };

    // FIXME: "Defaults to false"?
    this.isNegated = function () {
      var parent = this.parent;
      return !!parent ? parent.isNegated() : true;
    };
  }

, NullOperation: function () {

    // TODO: Make sure it's either a Hash or a Resource
    this.matches = function (resource) {
      return true;
    };

    this.isValid = function () {
      return true;
    };

    this.isNull = function () {
      return true;
    };

  }
};

(function () {
  var ctor;
  for (var t in operationTypes) {
    ctor = operationTypes[t];
    ctor.prototype = new OperationBase();
    ctor.prototype.constructor = ctor;
  }
})();

// Export the specific constructors as well as the `create` function
utils.mixin(operation, operationTypes);
operation.OperationBase = OperationBase;

module.exports = operation;


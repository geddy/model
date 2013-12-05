var assert = require('assert')
  , model = require('../../lib')
  , tests;

var ByTor = function () {
  this.property('numberProp', 'number');
  this.property('intProp', 'int');
  this.property('objectProp', 'object');
  this.property('dateProp', 'date');
  this.property('datetimeProp', 'datetime');
  this.property('timeProp', 'time');
};

ByTor = model.register('ByTor', ByTor);

var tests = {
  'test all properties optional': function () {
    var params = {};
    var byTor = ByTor.create(params);
    assert.ok(byTor.isValid());
  }

, 'test number': function () {
    var byTor;
    // Actual number, valid
    byTor = ByTor.create({numberProp: 2112});
    assert.ok(byTor.isValid());

    // Numeric string, valid
    byTor = ByTor.create({numberProp: '2112'});
    assert.ok(byTor.isValid());

    // Zero, valid
    byTor = ByTor.create({numberProp: 0});
    assert.ok(byTor.isValid());

    // Non-numeric string, error
    byTor = ByTor.create({numberProp: 'Snow Dog'});
    assert.notStrictEqual(byTor.errors.numberProp, undefined);
  }

, 'test integer': function () {
    var byTor;
    // Actual int, valid
    byTor = ByTor.create({intProp: 2112});
    assert.ok(byTor.isValid());

    // Actual int, valid
    byTor = ByTor.create({intProp: '2112'});
    assert.ok(byTor.isValid());

    // Float with zero decimal, valid
    byTor = ByTor.create({intProp: 2112.0});
    assert.ok(byTor.isValid());

    // Float with greater-than-zero decimal, error
    byTor = ByTor.create({intProp: 2112.2112});
    assert.notStrictEqual(byTor.errors.intProp, undefined);

    // Non-numeric string, error
    byTor = ByTor.create({intProp: 'away from here'});
    assert.notStrictEqual(byTor.errors.intProp, undefined);
  }

, 'test object': function () {
    var byTor;
    // Actual Object, valid
    byTor = ByTor.create({objectProp: {}});
    assert.ok(byTor.isValid());

    // string, should fail
    byTor = ByTor.create({objectProp: 'As gray traces of dawn ...'});
    assert.notStrictEqual(byTor.errors.objectProp, undefined);
    
    // JSON string, valid
    byTor = ByTor.create({objectProp: JSON.stringify({foo:'bar',fooList:['bar','bar','bar']})});
    assert.ok(byTor.isValid());
  }

, 'test date': function () {
    var byTor;
    var dates = [
        '12/27/1968'
      , '12-27-1968'
      , '12.27.1968'
      , '1968/12/27'
      , '1968-12-27'
      , '1968.12.27'
      , [1968, 12, 27]
      , new Date(1968, 11, 27)
      , new Date('12/27/1968')
      , 'Fri, 27 Dec 1968'
    ];
    var dt;
    for (var i = 0, ii = dates.length; i < ii; i++) {
      dt = dates[i];
      byTor = ByTor.create({dateProp: dt});
      assert.ok(byTor.isValid(), 'Testing valid');
      assert.equal(byTor.dateProp.getFullYear(), 1968, 'Testing getFullYear');
      assert.equal(byTor.dateProp.getMonth(), 11, 'Testing getMonth'); // Zero-based
      assert.equal(byTor.dateProp.getDate(), 27, 'Testing getDate');
    }
  }

, 'test datetime': function () {
    var byTor;
    var dates, dt;
    // Dates with no set time -- time should be set to 12 midnight
    dates = [
      '1968/12/27'
      , '1968-12-27'
      , '1968.12.27'
      , [1968, 12, 27]
      , new Date(1968, 11, 27)
      , new Date('12/27/1968')
      , 'Fri, 27 Dec 1968'
    ];
    for (var i = 0, ii = dates.length; i < ii; i++) {
      dt = dates[i];
      byTor = ByTor.create({datetimeProp: dt});
      assert.ok(byTor.isValid());
      assert.equal(byTor.datetimeProp.getFullYear(), 1968);
      assert.equal(byTor.datetimeProp.getMonth(), 11); // Zero-based
      assert.equal(byTor.datetimeProp.getDate(), 27);
      assert.equal(byTor.datetimeProp.getHours(), 0);
      assert.equal(byTor.datetimeProp.getMinutes(), 0);
      assert.equal(byTor.datetimeProp.getSeconds(), 0);
    }
    // Dates with times
    dates = [
      '1968-12-27 16:10:03'
      , [1968, 12, 27, 16, 10, 3]
      , new Date(1968, 11, 27, 16, 10, 3)
      , 'Fri, 27 Dec 1968 16:10:03'
    ];
    for (var i = 0, ii = dates.length; i < ii; i++) {
      dt = dates[i];
      byTor = ByTor.create({datetimeProp: dt});
      assert.ok(byTor.isValid());
      assert.equal(byTor.datetimeProp.getFullYear(), 1968);
      assert.equal(byTor.datetimeProp.getMonth(), 11); // Zero-based
      assert.equal(byTor.datetimeProp.getDate(), 27);
      assert.equal(byTor.datetimeProp.getHours(), 16);
      assert.equal(byTor.datetimeProp.getMinutes(), 10);
      assert.equal(byTor.datetimeProp.getSeconds(), 3);
    }
  }

, 'test time': function () {
    var byTor;
    var dates, dt, vals;
    // Obj key is the input string, value is the list of values
    // for the parse Date object's h/m/s/ms
    dates = {
      '21:12' : [21, 12, 0, 0]
      , '1:11': [1, 11, 0, 0]
      , '1:11:03': [1, 11, 3, 0]
      , '1:11:03.999': [1, 11, 3, 999]
    };
    for (var p in dates) {
      dt = p;
      vals = dates[p];
      byTor = ByTor.create({timeProp: dt});
      assert.ok(byTor.isValid());
      assert.equal(byTor.timeProp.getHours(), vals[0]);
      assert.equal(byTor.timeProp.getMinutes(), vals[1]);
      assert.equal(byTor.timeProp.getSeconds(), vals[2]);
      assert.equal(byTor.timeProp.getMilliseconds(), vals[3]);
    }
  }

};

module.exports = tests;


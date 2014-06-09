var utils = require('utilities')
  , assert = require('assert')
  , model = require('../../lib')
  , Event = require('../fixtures/event').Event
  , Schedule = require('../fixtures/schedule').Schedule
  , FunActivity = require('../fixtures/fun_activity').FunActivity
  , Message = require('../fixtures/message').Message
  , Photo = require('../fixtures/photo').Photo
  , Participation = require('../fixtures/participation').Participation
  , Person = require('../fixtures/person').Person
  , tests;

model.registerDefinitions([
  { ctorName: 'Event'
  , ctor: Event
  }
, { ctorName: 'Schedule'
  , ctor: Schedule
  }
, { ctorName: 'FunActivity'
  , ctor: FunActivity
  }
, { ctorName: 'Message'
  , ctor: Message
  }
, { ctorName: 'Photo'
  , ctor: Photo
  }
, { ctorName: 'Participation'
  , ctor: Participation
  }
, { ctorName: 'Person'
  , ctor: Person
  }
]);

tests = {
  'test valid instance': function () {
    var c = model.Event.create({
      title: 'zerb'
    , description: 'asdf'
    });
    assert.ok(c.isValid());
  }

, 'test non-valid instance': function () {
    var c = model.Event.create({
      title: 'zerb'
    });
    assert.ok(!c.isValid());
  }

, 'test serialize has defined properties': function () {
    var c = model.Event.create({
      title: 'zerb'
    , description: 'asdf'
    });
    c = c.toJSON();
    assert.equal('zerb', c.title);
    assert.equal('asdf', c.description);
  }

, 'test serialize has no business-logic methods': function () {
    var c = model.Event.create({
      title: 'zerb'
    , description: 'asdf'
    });
    c = c.toJSON();
    assert.ok(!c.getAdmins);
  }

, 'test serialize excludes ad-hoc props': function () {
    var c = model.Event.create({
      title: 'zerb'
    , description: 'asdf'
    });
    c.frang = 'w00t';
    c = c.toJSON();
    assert.ok(!c.frang);
  }

, 'test serialize includes whitelisted ad-hoc props': function () {
    var c = model.Event.create({
      title: 'zerb'
    , description: 'asdf'
    });
    c.frang = 'w00t';
    c = c.toJSON({whitelist: 'frang'});
    assert.equal('w00t', c.frang);
  }

, 'test serialize includes hasMany association props': function () {
    var c = model.Event.create({
          title: 'zerb'
        , description: 'asdf'
        })
      , admins = [{}, {}];
    c.admins = admins;
    c = c.toJSON();
    assert.strictEqual(admins, c.admins);
  }

, 'test serialize includes hasOne association props': function () {
    var s = model.Schedule.create({
          title: 'zerb'
        , description: 'asdf'
        })
      , event = {};
    s.event = event;
    s = s.toJSON();
    assert.strictEqual(event, s.event);
  }

, 'test date property should not allow arbitrary string': function () {
    var c = model.Event.create({
          title: 'zerb'
        , description: 'asdf'
        , startingOn: 'howdy'
        });
    assert.ok(!c.isValid());
    assert.ok(c.errors.startingOn);
  }

};

module.exports = tests;

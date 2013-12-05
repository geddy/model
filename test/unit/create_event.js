var utils = require('utilities')
  , assert = require('assert')
  , model = require('../../lib')
  , Event = require('../fixtures/event').Event
  , Schedule = require('../fixtures/schedule').Schedule
  , tests;

tests = {
  'test valid instance': function () {
    var c = Event.create({
      title: 'zerb'
    , description: 'asdf'
    });
    assert.ok(c.isValid());
  }

, 'test non-valid instance': function () {
    var c = Event.create({
      title: 'zerb'
    });
    assert.ok(!c.isValid());
  }

, 'test serialize has defined properties': function () {
    var c = Event.create({
      title: 'zerb'
    , description: 'asdf'
    });
    c = c.toJSON();
    assert.equal('zerb', c.title);
    assert.equal('asdf', c.description);
  }

, 'test serialize has no business-logic methods': function () {
    var c = Event.create({
      title: 'zerb'
    , description: 'asdf'
    });
    c = c.toJSON();
    assert.ok(!c.getAdmins);
  }

, 'test serialize excludes ad-hoc props': function () {
    var c = Event.create({
      title: 'zerb'
    , description: 'asdf'
    });
    c.frang = 'w00t';
    c = c.toJSON();
    assert.ok(!c.frang);
  }

, 'test serialize includes whitelisted ad-hoc props': function () {
    var c = Event.create({
      title: 'zerb'
    , description: 'asdf'
    });
    c.frang = 'w00t';
    c = c.toJSON({whitelist: 'frang'});
    assert.equal('w00t', c.frang);
  }

, 'test serialize includes hasMany association props': function () {
    var c = Event.create({
          title: 'zerb'
        , description: 'asdf'
        })
      , admins = [{}, {}];
    c.admins = admins;
    c = c.toJSON();
    assert.strictEqual(admins, c.admins);
  }

, 'test serialize includes hasOne association props': function () {
    var s = Schedule.create({
          title: 'zerb'
        , description: 'asdf'
        })
      , event = {};
    s.event = event;
    s = s.toJSON();
    console.dir(s);
    assert.strictEqual(event, s.event);
  }

};

module.exports = tests;

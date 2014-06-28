var model = require('../../../lib')
  , fs = require('fs')
  , utils = require('utilities')
  , helpers
  , fixtureNameList = ['event', 'person', 'participation', 'message',
      'photo', 'schedule', 'friendship', 'fun_activity', 'result']
  , fixtures = (function () {
      var fixtureList = [];
      fixtureNameList.forEach(function (item) {
        var ctor
          , ctorName;
        ctorName = utils.string.camelize(item, {initialCap: true});
        ctor = require('../../fixtures/' + item)[ctorName];
        fixtureList.push({
          ctorName: ctorName
        , ctor: ctor
        });
      });
      return fixtureList;
    })()
  , fixtureNames = fixtures.map(function (f) {
      return f.ctorName;
    });

helpers = {
  fixtures: fixtures

, fixtureNames: fixtureNames

, createFixtures: function (cb) {
    var relations = fixtureNames.slice()
      , doIt = function () {
          var relation = relations.shift()
            , items = []
            , titleLetters
            , descrLetters;
          if (relation) {
            titleLetters = 'abcdefghijklmnopqrst'.split('');
            descrLetters = titleLetters.slice();
            titleLetters.forEach(function (letter) {
              items.push(model[relation].create({
                title: letter
              , description: descrLetters.pop()
              }));
            });
            model[relation].save(items, function (err, data) {
              if (err) {
                return cb(err);
              }
              doIt();
            });
          }
          else {
            cb();
          }
        };
    doIt();
  }

, deleteFixtures: function (cb) {
    var relations = fixtureNames.slice()
      , doIt = function () {
          var relation = relations.shift();
          if (relation) {
            model[relation].all({}, function (err, data) {
              var ids = [];
              if (err) { throw err; }
              data.forEach(function (item) {
                ids.push(item.id);
              });
              model[relation].remove({id: ids}, function (err, data) {
                if (err) { return cb(err); }
                doIt();
              });
            });
          }
          else {
            cb();
          }
        };
    doIt();
  }

, updateItems: function (coll, cb) {
    var collection = coll.slice()
      , doIt = function () {
          var item = collection.pop();
          if (item) {
            item.save(function (err, data) {
              if (err) { throw err; }
              doIt();
            });
          }
          else {
            cb();
          }
        };
    doIt();
  }

, foundOutOfOrderItemAscending: function (item, index) {
    var nextItem = this[index + 1];
    if (nextItem && (item.title.charCodeAt(0) >
        nextItem.title.charCodeAt(0))) {
      return true;
    }
  }

, foundOutOfOrderItemDescending: function (item, index) {
    var nextItem = this[index + 1];
    if (nextItem && (item.title.charCodeAt(0) <
        nextItem.title.charCodeAt(0))) {
      return true;
    }
  }

};

module.exports = helpers;

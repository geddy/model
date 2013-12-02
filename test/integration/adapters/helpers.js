var model = require('../../../lib')
  , fixtures = ['Event', 'Person', 'Participation', 'Message',
      'Photo', 'Schedule', 'Friendship'];

module.exports = {
  fixtures: fixtures

, createFixtures: function (cb) {
    var relations = fixtures.slice()
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

, deleteFixtures: function (cb) {
    var relations = fixtures.slice()
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
                if (err) { throw err; }
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


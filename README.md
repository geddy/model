Model
==============

[![build status](https://secure.travis-ci.org/mde/model.png)](http://travis-ci.org/mde/model)

Model is a datastore-agnostic ORM in JavaScript. It serves as the
model-component for the [Geddy MVC Web framework](http://geddyjs.org/) for
NodeJS.

### License

Apache License, Version 2

### Prerequisites

Model requires version 0.6.x of Node.js or higher. If you want to run the tests,
or work on Model, you'll want the [Jake](https://github.com/mde/jake) JavaScript
build-tool.

### Installing with [NPM](http://npmjs.org/)

```
npm install model
```

## Adapters

Model currently implements adapters for:

* Postgres
* Riak
* MongoDB

## Defining models

Model uses a pretty simple syntax for defining a model. (It should look familiar
to anyone who has used an ORM like ActiveRecord, DataMapper, Django's models, or
SQLAlchemy.)

```javascript
var User = function () {
  this.property('login', 'string', {required: true});
  this.property('password', 'string', {required: true});
  this.property('lastName', 'string');
  this.property('firstName', 'string');

  this.validatesPresent('login');
  this.validatesFormat('login', /[a-z]+/, {message: 'Subdivisions!'});
  this.validatesLength('login', {min: 3});
  this.validatesConfirmed('password', 'confirmPassword');
  this.validatesWithFunction('password', function (s) {
      // Something that returns true or false
      return s.length > 0;
  });

  // Can define methods for instances like this
  this.someMethod = function () {
    // Do some stuff
  };
};

// Can also define them on the prototype
User.prototype.someOtherMethod = function () {
  // Do some other stuff
};

User = model.registerModel('User', User);
```

### Abbreviated syntax

Alternatively, you can use the `defineProperties` method to lay out your model's
properties in one go:

```javascript
var User = function () {
  this.defineProperties({
    login: {type: 'string', required: true}
  , password: {type: 'string', required: true}
  , lastName: {type: 'string'}
  , firstName: {type: 'string'}
  });
}
```

## Creating instances

Creating an instance of one of these models is easy:

```javascript
var params = {
  login: 'alex'
, password: 'lerxst'
, lastName: 'Lifeson'
, firstName: 'Alex'
};
var user = User.create(params);
```

## Validation and errors

Data-validation happens on the call to `create`, and any validation errors show
up inside an `errors` property on the instance, keyed by field name. Instances
have an `isValid` method that returns a Boolean indicating whether the instance is
valid.

```javascript
// Leaving out the required password field
var params = {
  login: 'alex'
};
var user = User.create(params);

// Prints 'false'
console.log(user.isValid());
// Prints 'Field "password" is required'
console.log(user.errors.password);
```

## Saving items

After creating the instance, call the `save` method on the instance. This method
takes a callbak in the familiar (err, data) format for Node.

```javascript
if (user.isValid()) {
  user.save(function (err, data) {
    if (err) {
      throw err;
    }
    console.log('New item saved!');
  });
}
```

## Updating items

Use the `updateProperties` method to update the values of the properties on an
instance with the appropriate validations. Then call `save` on the instance.

```javascript
user.updateProperties({
  login: 'alerxst'
});
if (user.isValid()) {
  user.save(function (err, data) {
    if (err) {
      throw err;
    }
    console.log('Item updated!');
  });
}
```

## Lifecycle events

Both the base model 'constructors,' and model instances are EventEmitters. The
emit events during the create/update/remove lifecycle of model instances. In all
cases, the plain-named event is fired after the event in question, the
'before'-prefixed event, of course happens before.

The 'constructor' for a model emits the following events:

 * beforeCreate
 * create
 * beforeValidate
 * validate
 * beforeUpdateProperties
 * updateProperties
 * beforeSave (new instances, single and bulk)
 * save (new instances, single and bulk)
 * beforeUpdate (existing single instances, bulk updates)
 * update (existing single instances, bulk updates)
 * beforeRemove
 * remove

Model-item instances emit these events:

 * beforeUpdateProperties
 * updateProperties
 * beforeSave
 * save
 * beforeUpdate
 * update

## Querying

Model uses a simple API for finding and sorting items. Again, it should look
familiar to anyone who has used a similar ORM for looking up records. The only
wrinkle with Model is that the API is (as you might expect for a NodeJS library)
asynchronous.

Methods for querying are static methods on each model constructor.

### Finding a single item

Use the `first` method to find a single item. You can pass it an id, or a set of
query parameters in the form of an object-literal. In the case of a query, it
will return the first item that matches, according to whatever sort you've
specified.

```javascript
var user;
User.first({login: 'alerxst'}, function (err, data) {
  if (err) {
    throw err;
  }
  user = data;
  console.log('Found user');
  console.dir(user);
});
```

### Collections of items

Use the `all` method to find lots of items. Pass it a set of query parameters in
the form of an object-literal, where each key is a field to compare, and the
value is either a simple value for comparison (equal to), or another
object-literal where the key is the comparison-operator, and the value is the
value to use for the comparison.

```javascript
var users
  , dt;

dt = new Date();
dt.setHours(dt.getHours() - 24);

// Find all the users created since yesterday
User.all({createdAt: {gt: dt}, function (err, data) {
  if (err) {
    throw err;
  }
  users = data;
  console.log('Found users');
  console.dir(users);
});
```

Here are some more examples of queries:

```javascript
// Where "foo" is 'BAR' and "bar" is not null
{foo: 'BAR', bar: {ne: null}}
// Where "foo" begins with 'B'
{foo: {'like': 'B'}}
// Where foo is less than 2112, and bar is 'BAZ'
{foo: {lt: 2112}, bar: 'BAZ'}
```

### Comparison operators

Here is the list of comparison operators currently supported:

eql: equal to
ne: not equal to
gt: greater than
lt: less than
gte: greater than or equal
lte: less than or equal
like: like

A simple string-value for a query parameter is the same as 'eql'. `{foo: 'bar'}`
is the same as `{foo: {eql: 'bar'}}`.

## More complex queries

Model supports combining queries with OR and negating queries with NOT.

To perform an 'or' query, use an object-literal with a key of 'or', and an array
of query-objects to represent each set of alternative conditions:

```javascript
// Where "foo" is 'BAR' OR "bar" is 'BAZ'
{or: [{foo: 'BAR'}, {bar: 'BAZ'}]}
// Where "foo" is not 'BAR' OR "bar" is null OR "baz" is less than 2112
{or: [{foo {ne: 'BAR'}}, {bar: null}, {baz: {lt: 2112}}]}
```

To negate a query with 'not', simply use a query-object where 'not' is the key,
and the value is the set of conditions to negate:

```javascript
// Where NOT ("foo" is 'BAR' and "bar" is 'BAZ')
{not: {foo: 'BAR', bar: 'BAZ'}}
// Where NOT ("foo" is 'BAZ' and "bar" is less than 1001)
{not: {foo: 'BAZ', bar: {lt: 1001}}}
```

These OR and NOT queries can be nested and combined:

```javascript
// Where ("foo" is like 'b' OR "foo" is 'foo') and NOT "foo" is 'baz'
{or: [{foo: {'like': 'b'}}, {foo: 'foo'}], not: {foo: 'baz'}}
```

## Sorting

The `all` API-call for querying accepts an optional options-object after the
query-conditions. Set a 'sort' in that options-object to specifiy properties to
sort on, and the sort-direction for each one.

```javascript
var users
// Find all the users who have ever been updated, and sort by
// creation-date, ascending, then last name, descending
User.all({updatedAt: {ne: null}}, {sort: {createdAt: 'asc', lastName: 'desc'}},
    function (err, data) {
  if (err) {
    throw err;
  }
  users = data;
  console.log('Updated users');
  console.dir(users);
});
```

### Simplified syntax

You can use a simplified syntax for specifying the sort. The default
sort-direction is ascending ('asc'), so you can specify a property to sort on
(or multiple properties as an array) if you want all sorts to be ascending:

```javascript
// Sort by createdAt, ascending
{sort: 'createdAt'}
// Sort by createdAt, then updatedAt, then lastName,
// then firstName -- all ascending
{sort: ['createdAt', 'updatedAt', 'lastName', 'firstName']}

```

## Associations

Model has very basic support for associations: including hasMany/belongsTo and
hasOne/belongsTo. For example, if you had a `User` model with a single
`Profile`, and potentially many `Accounts`:

```javascript
var User = function () {
  this.property('login', 'string', {required: true});
  this.property('password', 'string', {required: true});
  this.property('confirmPassword', 'string', {required: true});

  this.hasOne('Profile');
  this.hasMany('Accounts');
};

var Profile = function () {
  this.property('nickname', 'string');
  this.property('setting1', 'boolean');
  this.property('setting2', 'boolean');

  this.belongsTo('User');
};

var Account = function () {
  this.property('location', 'string');

  this.belongsTo('User');
};
```

Add the `hasOne` relationship by calling 'set' plus the name of the belonging
model in singular (in this case `setProfile`). Retrieve the associated item by
using 'get' plus the name of the belonging model in singular (in this case
`getProfile`). Here's an example:

```javascript
var u = User.create({
  login: 'asdf'
, password: 'zerb'
, confirmPassword: 'zerb'
});
u.save(function (err, data) {
  var profile;
  if (err) {
    throw err;
  }
  profile = Profile.create({});
  user.setProfile(profile);
  user.save(function (err, data) {
    if (err) {
      throw err;
    }
    user.getProfile(function (err, data) {
      if (err) {
        throw err;
      }
      console.log(profile.id ' is the same as ' + data.id);
    });
  });
});
```

Set up the `hasMany` relationship by calling 'add' plus the name of the
belonging model in singular (in this case `addAccount`). Retrieve the associated
items with a call to 'get' plus the name of the belonging model in plural (in
this case `getAccounts`). An example:

```javascript
var u = User.create({
  login: 'asdf'
, password: 'zerb'
, confirmPassword: 'zerb'
});
u.save(function (err, data) {
  var account;
  if (err) {
    throw err;
  }
  user.addAccount(Account.create({}));
  user.addAccount(Account.create({}));
  user.save(function (err, data) {
    if (err) {
      throw err;
    }
    user.getAccounts(function (err, data) {
      if (err) {
        throw err;
      }
      console.log('This number should be 2: ' + data.length);
    });
  });
});
```

- - -
Model JavaScript ORM copyright 2112 mde@fleegix.org.




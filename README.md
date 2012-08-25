Model
==============

Model is a datastore-agnostic ORM in JavaScript. It serves as the
model-component for the [Geddy MVC Web framework](http://geddyjs.org/) for
NodeJS.

## Adapters

Model currently implements adapters for:

* Postgres
* Riak
* MongoDB

## Definining models

Model uses a pretty simple syntax for defining a model. (It should look familiar
to anyone who has used ActiveRecord, DataMapper, Django's models, or
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

### Simpler syntax

Alternatively, you can use the `defineProperties` method to lay out your model:

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

### Creating instances

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

### Validation and errors

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

### Saving items

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

### Updating items

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
the form of an object-literal, where each key is a field to compare, and the value is either a simple value for comparison (equal to), or another object-literal where the key is the comparison-operator, and the value is the value to use for the comparison.

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
// Where "foo" begins with 'B' (SQL-adapter only)
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
like: like (SQL adapters only)

A simple string-value for a query parameter is the same as 'eql'. `{foo: 'bar'}`
is the same as `{foo: {eql: 'bar'}}`.

### More complex queries

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





# module-data
This module gathers a module's statistical data. There are three statistical data types and those are `local data`, `remote data` and `standard data`, being the last one a merge between the first two.

You can see [here the data structure of those three statistical data types.](https://github.com/yldio/module-data/blob/master/schemas.js)

## Installation
```bash
$ npm i module-data
```

## Documentation

### Core
- [local](#local)
- [remote](#remote)

### Toolbox
- [dependenciesSet](#depsSet)
- [standardize](#standardize)
- [validate](#validate)

## Core

<a name="local"></a>
### local(modulePath, [options,] callback)

This method will traverse local module data and return a tree based on [this schema.](https://github.com/yldio/module-data/blob/master/schemas.js#L33)

```js
var localData = require('module-data').local

var options = {
  depth: 10
}

localData(process.cwd(), options, function (err, data) {
  ...
})
```

<a name="remote"></a>
### remote(moduleName, options, callback)

This method will query remotely the module data and return a flat object based on [this schema.](https://github.com/yldio/module-data/blob/master/schemas.js#L14)

```js
var remoteData = require('module-data').remote

var options = {
  version: '1.0.0'
}

remoteData('module-data', options, function (err, data) {
  ...
})
```

## Toolbox

<a name="depsSet"></a>
### dependenciesSet(data)
This method will return a dependencies' `Set` object from the local data tree.

```js
var getDepsTree = require('module-data/dependencies-set')

var localData = { ... }

// {
//    'async': ['1.0.0', '1.1.2'],
//    'request': ['0.1.0']
// }
var depsTree = getDepsTree(localData)
```

<a name="standardize"></a>
### standardize(data, callback)
This method will merge `local data` and `remote data` into a `standard data`.

```js
var standardize = require('module-data/standardize')

var data = {
  local: { ... },
  remote: { ... }
}

standardize(data, function (err, standardData) {
  ...
})
```

<a name="validate"></a>
### validate(type, data, callback)
This method validates `local data`, `remote data` and `standard data`.

```js
var validate = require('module-data/validate')

var localData = { ... }
var remoteData = { ... }
var standardData = { ... }

function handleValidation (err) {
  ...
}

validate('local', localData, handleValidation)
validate('remote', remoteData, handleValidation)
validate('standard', standardData, handleValidation)
```

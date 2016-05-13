var schemas = require('./schemas')
var Joi = require('joi')
var async = require('async')
var toString = Object.prototype.toString

module.exports = validate

var validators = {
  standard: validateTree,
  remote: validateFlat,
  local: validateTree
}

function validate (type, data, done) {
  if (!validators[type]) {
    return done(new Error('Unknown type.'))
  }

  if (toString.call(data) === '[object Object]') {
    data = [data]
  }

  if (toString.call(data) !== '[object Array]') {
    return done(new Error('Incorrect data.'))
  }

  return validators[type](data, schemas[type], done)
}

function validateFlat (arr, schema, done) {
  var tasks = []

  arr.forEach(function (obj) {
    tasks.push(function (next) {
      return Joi.validate(obj, schema, next)
    })
  })

  return async.series(tasks, done)
}

function validateTree (arr, schema, done) {
  var queue = []

  arr.forEach(function (obj) {
    recursive(obj, schema, queue)
  })

  return async.series(queue, done)
}

function validateDepsNameAndVersion (mdlName, obj) {
  return function (done) {
    var err, version

    mdlName = mdlName.split('@')
    version = mdlName[1]
    mdlName = mdlName[0]

    if (mdlName !== obj.name || version !== obj.version) {
      err = new Error('Dependency name and/or version unexpected.')
    }

    return done(err)
  }
}

function recursive (obj, schema, queue) {
  queue.push(function (done) {
    Joi.validate(obj, schema, done)
  })

  if (obj.dependencies && ~Object.keys(obj.dependencies).length) {
    for (var dep in obj.dependencies) {
      queue.push(validateDepsNameAndVersion(dep, obj.dependencies[dep]))
      recursive(obj.dependencies[dep], schema, queue)
    }
  }
}

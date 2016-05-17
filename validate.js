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

  if (toString.call(data) !== '[object Object]') {
    return done(new Error('Incorrect data.'))
  }

  return validators[type](data, schemas[type], done)
}

function validateFlat (data, schema, done) {
  // Check if it is single remote module's data
  if (~Object.keys(data).indexOf('__moduleData')) {
    return Joi.validate(data, schema, done)
  } else {
    var queue = []

    // Multiple remote module's data
    Object.keys(data).forEach(function (dep) {
      queue.push(validateDepsName(dep, data[dep]))
      queue.push(function (next) {
        return Joi.validate(data[dep], schema, next)
      })
    })

    return async.series(queue, done)
  }
}

function validateTree (data, schema, done) {
  var queue = []

  Object.keys(data).forEach(function (rootDep) {
    queue.push(validateDepsName(rootDep, data[rootDep]))
    recursive(data[rootDep], schema, queue)
  })

  return async.series(queue, done)
}

function validateDepsName (mdlName, obj) {
  return function (done) {
    var err

    if (mdlName !== obj.name) {
      err = new Error('Dependency name unexpected.')
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
      queue.push(validateDepsName(dep, obj.dependencies[dep]))
      recursive(obj.dependencies[dep], schema, queue)
    }
  }
}

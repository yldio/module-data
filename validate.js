var schemas = require('./schemas')
var Joi = require('joi')
var async = require('async')

module.exports = validate

var validators = {
  standard: validateTree,
  remote: validateFlat,
  local: validateTree
}

function validate (type, obj, done) {
  if (!validators[type]) {
    return done(new Error('Unknown type.'))
  }

  return validators[type](obj, schemas[type], done)
}

function validateFlat (obj, schema, done) {
  return Joi.validate(obj, schema, done)
}

function validateTree (obj, schema, done) {
  var queue = []

  recursive(obj, schema, queue)

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

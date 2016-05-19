var async = require('async')
var toString = Object.prototype.toString
var getDepsSet = require('./dependencies-set')
var validate = require('./validate')
var initStandardData = require('./lib/data-handler').initStandardData

module.exports = standardize

function standardize (data, done) {
  if (toString.call(data) !== '[object Object]') {
    return done(new Error('Argument data isn\'t an object.'))
  }

  // Validate data
  return validateData(data, function (err) {
    if (err) {
      return done(err)
    }

    var standardData = {}
    Object.keys(data.local).forEach(function (mdl) {
      standardData[mdl] = recursive(data.local[mdl], data.remote)
    })

    return done(null, standardData)
  })
}

function validateData (data, done) {
  var localDataCorrupted = (toString.call(data.local) !== '[object Object]')
  var remoteDataCorrupted = (toString.call(data.remote) !== '[object Object]')
  if (localDataCorrupted || remoteDataCorrupted) {
    return done(new Error('Local or/and remote data ain\'t an object.'))
  }

  return async.series([
    function (next) {
      validate('local', data.local, next)
    },

    function (next) {
      validate('remote', data.remote, next)
    },

    // NOTE: This validation method will work
    // as long depsSet keys have a single version
    function (next) {
      var depsSet = getDepsSet(data.local)
      var err

      var test = Object.keys(depsSet).every(function (dep) {
        if (!data.remote[dep]) {
          return false
        }

        // NOTE: no need to validate anything more
        if (data.remote[dep].private) {
          return true
        }

        var v = depsSet[dep][0]
        return (data.remote[dep] && data.remote[dep].versions[v])
      })

      if (!test) {
        err = new Error('Missing remote data to fulfill the merge.')
      }

      return next(err)
    }
  ], done)
}

function recursive (obj, remotePkgs) {
  var standardData = initStandardData(obj, remotePkgs)

  if (obj.dependencies && ~Object.keys(obj.dependencies).length) {
    for (var dep in obj.dependencies) {
      standardData.dependencies[dep] = recursive(obj.dependencies[dep], remotePkgs)
    }
  }

  return standardData
}

var licenseApi = require('../api/local/license')
var testsApi = require('../api/local/tests')
var SlocApi = require('../api/local/sloc')
var dataHandler = require('../data-handler')
var path = require('path')
var fs = require('fs')
var extend = require('xtend')

module.exports = local

function local (mdlPath, options, cb) {
  if (typeof options === 'function') {
    cb = options
    options = {}
  } else {
    options = options || {}
    options = extend({}, options)
  }

  var localData = {}
  var refErr = {}

  var slocApi = new SlocApi(refErr)

  scan(refErr, slocApi, localData, mdlPath, true)

  slocApi.done(function () {
    if (refErr.err) {
      localData = null
      return cb(refErr.err)
    }

    // This will mutate localData
    // recursively with the real sloc
    SlocApi.countReal(localData)

    localData = {
      dependencies: localData.dependencies
    }

    if (Number.isInteger(parseInt(options.depth, 10))) {
      handleObjDepth(localData, options.depth)
    }

    return cb(null, localData.dependencies)
  })
}

function scan (refErr, slocApi, localData, mdlPath, rootPath) {
  if (refErr.err) {
    return
  }

  try {
    var mdlPkg = require(path.resolve(mdlPath, 'package.json'))
  } catch (e) {
    refErr.err = e
    return
  }

  // First scan
  if (rootPath === true) {
    dataHandler.initLocalData(localData, mdlPkg, true)
    rootPath = mdlPath
  } else {
    // Subsequent ones
    dataHandler.initLocalData(localData, mdlPkg)
  }

  var hasDeps = (mdlPkg.dependencies && ~Object.keys(mdlPkg.dependencies).length)
  if (hasDeps) {
    for (var dep in mdlPkg.dependencies) {
      localData.dependencies[dep] = {}

      scan(
        refErr,
        slocApi,
        localData.dependencies[dep],
        resolveDepPath(refErr, dep, mdlPath, rootPath),
        rootPath
      )
    }
  }

  localData.tests = testsApi(mdlPath, mdlPkg)
  slocApi.exec(localData, mdlPath)
  localData.license = licenseApi(mdlPath, mdlPkg)
}

function resolveDepPath (refErr, name, parentPath, rootPath) {
  var mdlPath

  try {
    mdlPath = path.resolve(parentPath, 'node_modules/' + name)
    fs.statSync(mdlPath)
  } catch (e) {
    try {
      mdlPath = path.resolve(rootPath, 'node_modules/' + name)
      fs.statSync(mdlPath)
    } catch (e) {
      mdlPath = false
      refErr.err = e
    }
  }

  return mdlPath
}

function handleObjDepth (obj, maxDepth, depth, cursor) {
  depth = depth || 0
  cursor = cursor || []

  if (depth > maxDepth + 1) {
    cursor.forEach(function (pos) {
      pos.obj.dependencies = {}
    })
  } else {
    if (!obj) {
      return
    }

    depth++
    var closestChildWithGrandChilds

    // Check if cursor is empty
    if (cursor.length < 1) {
      var childrenKeys = Object.keys(obj.dependencies)

      if (childrenKeys.length < 1) {
        return
      }

      for (var i = 0; i < childrenKeys.length; i++) {
        if (closestChildWithGrandChilds) {
          break
        }
        var key = childrenKeys[i]
        var depsOfDeps = obj.dependencies[key].dependencies

        if (depsOfDeps && Object.keys(depsOfDeps).length > 0) {
          closestChildWithGrandChilds = obj.dependencies[key]
        }
      }

      cursor.push({obj: obj, keys: childrenKeys})
    } else {
      var newCursor = []

      cursor.forEach(function (pos) {
        pos.keys.forEach(function (key) {
          var depsOfDeps = pos.obj.dependencies[key].dependencies

          var childrenKeys = Object.keys(depsOfDeps)
          if (childrenKeys.length > 0) {
            if (!closestChildWithGrandChilds) {
              closestChildWithGrandChilds = pos.obj.dependencies[key]
            }

            newCursor.push({ obj: pos.obj.dependencies[key], keys: childrenKeys })
          }
        })
      })

      cursor = newCursor
    }

    handleObjDepth(closestChildWithGrandChilds, maxDepth, depth, cursor)
  }
}

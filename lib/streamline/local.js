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

  scan(refErr, slocApi, localData, mdlPath, null, true)

  slocApi.done(function () {
    if (refErr.err) {
      localData = null
      return cb(refErr.err)
    }

    Object.keys(localData).forEach(function (dep) {
      // This will mutate localData[dep]
      // recursively with the real sloc
      SlocApi.countReal(localData[dep])
    })

    if (Number.isInteger(parseInt(options.depth, 10))) {
      handleObjDepth(localData, options.depth)
    }

    return cb(null, localData)
  })
}

function scan (refErr, slocApi, localData, mdlPath, rootPath, firstScan) {
  if (refErr.err) {
    return
  }

  try {
    var mdlPkg = require(path.resolve(mdlPath, 'package.json'))
  } catch (e) {
    refErr.err = e
    return
  }

  // Sanity
  mdlPkg.dependencies = mdlPkg.dependencies || {}

  if (!firstScan) {
    dataHandler.initLocalData(localData, mdlPkg)
    localData.tests = testsApi(mdlPath, mdlPkg)
    slocApi.exec(localData, mdlPath)
    localData.license = licenseApi(mdlPath, mdlPkg)
    localData.dependenciesCount = Object.keys(mdlPkg.dependencies).length
  } else {
    rootPath = mdlPath
  }

  var hasDeps = (mdlPkg.dependencies && ~Object.keys(mdlPkg.dependencies).length)
  if (hasDeps) {
    for (var dep in mdlPkg.dependencies) {
      var objRef
      if (firstScan) {
        localData[dep] = {}
        objRef = localData[dep]
      } else {
        localData.dependencies[dep] = {}
        objRef = localData.dependencies[dep]
      }

      scan(
        refErr,
        slocApi,
        objRef,
        resolveDepPath(refErr, dep, mdlPath, rootPath),
        rootPath
      )
    }
  }
}

function resolveDepPath (refErr, name, parentPath, rootPath) {
  var mdlPath

  parentPath = parentPath.replace(rootPath, '')
  parentPath = parentPath.replace(/\//g, '')

  var childrens = parentPath.split('node_modules')
  var possiblePaths = []
  childrens.forEach(function (pa, k) {
    if (!possiblePaths.length > 0) {
      possiblePaths.push(path.resolve(rootPath, 'node_modules/' + name))
    } else {
      possiblePaths.push(
        path.resolve(
          possiblePaths[k - 1].replace('node_modules/' + name, ''),
          'node_modules/' + pa + '/node_modules/' + name
        )
      )
    }
  })

  for (var i = 0; i < possiblePaths.length; i++) {
    mdlPath = possiblePaths[i]

    try {
      fs.statSync(mdlPath)
    } catch (e) {
      mdlPath = false
      continue
    }

    break
  }

  if (!mdlPath) {
    refErr.err = new Error('Couldn\'t find the module - ' + name)
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
      var childrenKeys = Object.keys(obj)

      if (childrenKeys.length < 1) {
        return
      }

      for (var i = 0; i < childrenKeys.length; i++) {
        if (closestChildWithGrandChilds) {
          break
        }
        var key = childrenKeys[i]
        var depsOfDeps = obj[key].dependencies

        if (depsOfDeps && Object.keys(depsOfDeps).length > 0) {
          closestChildWithGrandChilds = obj[key]
        }
      }

      cursor.push({obj: {dependencies: obj}, keys: childrenKeys})
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

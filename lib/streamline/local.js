var licenseApi = require('../api/local/license')
var testsApi = require('../api/local/tests')
var SlocApi = require('../api/local/sloc')
var dataHandler = require('../data-handler')
var path = require('path')
var fs = require('fs')

module.exports = local

function local (mdlPath, cb) {
  var localData = {}
  var refErr = {}

  var slocApi = new SlocApi(refErr)

  scan(refErr, slocApi, localData, mdlPath, true)

  slocApi.done(function () {
    if (refErr.err) {
      localData = null
      return cb(refErr.err)
    }

    return cb(null, localData)
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

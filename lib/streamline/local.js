var licenseApi = require('../api/local/license')
var testsApi = require('../api/local/tests')
var slocApi = require('../api/local/sloc')
var dataHandler = require('../data-handler')
var path = require('path')
var fs = require('fs')

module.exports = local

function local (mdlPath, done) {
  var localData = {}
  var err

  scan(err, localData, mdlPath, mdlPath)

  if (err) {
    localData = null
    return done(err)
  }

  return done(null, localData)
}

function scan (err, localData, mdlPath, rootPath) {
  if (err) {
    return
  }

  try {
    var mdlPkg = require(path.resolve(mdlPath, 'package.json'))
  } catch (e) {
    err = e
    return
  }

  localData = dataHandler.initLocalData(mdlPkg)

  var hasDeps = (mdlPkg.dependencies && ~Object.keys(mdlPkg.dependencies).length)
  if (hasDeps) {
    for (var dep in mdlPkg.dependencies) {
      scan(
        err,
        localData.dependencies,
        resolveDepPath(err, dep, mdlPath, rootPath),
        rootPath
      )
    }
  }

  localData.tests = testsApi(mdlPath, mdlPkg)
  localData.sloc = slocApi(mdlPath)
  localData.license = licenseApi(mdlPath)
}

function resolveDepPath (err, name, parentPath, rootPath) {
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
      err = e
    }
  }

  return mdlPath
}

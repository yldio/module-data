var pkg = require('../package.json')

var validTypes = [
  'local',
  'remote',
  'standard'
]

module.exports = {}
module.exports.addMetaData = addMetaData
module.exports.initStandardData = initStandardData
module.exports.initLocalData = initLocalData
module.exports.initRemoteData = initRemoteData

function addMetaData (type, obj) {
  if (!~validTypes.indexOf(type)) {
    throw new Error('Invalid type.')
  }

  obj.__moduleData = {
    type: type,
    version: pkg.version
  }
}

function initStandardData (localData, remotePkgs) {
  var standardData = {}
  var name = localData.name
  var v = localData.version
  var isPrivate = (localData.private || remotePkgs[name].private)

  // Local data
  standardData.name = name
  standardData.version = v
  standardData.private = isPrivate
  standardData.sloc = {
    real: localData.sloc.real,
    pkg: localData.sloc.pkg
  }
  standardData.tests = {
    exists: localData.tests.exists,
    framework: localData.tests.framework,
    npmScript: localData.tests.npmScript
  }
  standardData.license = localData.license
  standardData.dependenciesCount = localData.dependenciesCount

  // Remote data only if it
  // isn't a private module
  if (!isPrivate) {
    var remoteData = remotePkgs[name].versions[v]

    standardData.isOutdated = remoteData.isOutdated
    standardData.isDeprecated = remoteData.isDeprecated
    standardData.vulnerabilities = [].concat(remoteData.vulnerabilities)
  }

  standardData.dependencies = {}

  addMetaData('standard', standardData)

  return standardData
}

function initLocalData (localData, mdlPkg) {
  localData.name = mdlPkg.name
  localData.version = mdlPkg.version
  localData.dependencies = {}
  localData.private = !!mdlPkg.private

  addMetaData('local', localData)
}

function initRemoteData (moduleName) {
  var remoteData = {
    name: moduleName
  }

  addMetaData('remote', remoteData)

  return remoteData
}

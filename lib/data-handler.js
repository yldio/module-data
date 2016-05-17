var pkg = require('../package.json')

var validTypes = [
  'local',
  'remote',
  'standard'
]

module.exports = {}
module.exports = addMetaData
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

function initLocalData (localData, mdlPkg, metaFlag) {
  localData.name = mdlPkg.name
  localData.version = mdlPkg.version
  localData.dependencies = {}

  if (metaFlag) {
    addMetaData('local', localData)
  }
}

function initRemoteData (moduleName) {
  var remoteData = {
    name: moduleName
  }

  addMetaData('remote', remoteData)

  return remoteData
}

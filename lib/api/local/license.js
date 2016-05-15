var spdxLicenseIds = require('spdx-license-ids')
var fs = require('fs')
var path = require('path')

module.exports = getLicense

function getLicense (modulePath, modulePkg) {
  if (modulePkg.license && ~spdxLicenseIds.indexOf(modulePkg.license)) {
    return modulePkg.license
  }

  var license
  var rootFiles = fs.readdirSync(modulePath)

  var licenseFilePath = checkFile('license|licence', rootFiles, modulePath)
  if (licenseFilePath) {
    license = detectLicense(licenseFilePath)
  }

  if (license) {
    return license
  }

  var readmeFilePath = checkFile('readme', rootFiles, modulePath)
  if (readmeFilePath) {
    license = detectLicense(readmeFilePath)
  }

  if (license) {
    return license
  }

  return 'UNLICENSED'
}

function checkFile (rgx, rootFiles, modulePath) {
  var file
  rgx = new RegExp(rgx, 'ig')

  for (var i = 0; i < rootFiles.length; i++) {
    if (rootFiles[i].match(rgx)) {
      file = rootFiles[i]
      break
    }
  }

  if (!file) {
    return false
  }

  var filePath = path.resolve(modulePath, file)
  var fileStat = fs.statSync(filePath)

  if (!fileStat.isFile()) {
    return false
  }

  return filePath
}

// TODO
function detectLicense (string) {}

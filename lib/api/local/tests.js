var fs = require('fs')
var path = require('path')
var intersection = require('lodash.intersection')

var testFrameworks = [
  'mocha',
  'lab',
  'tape',
  'tap',
  'jasmine',
  'karma-qunit',
  'vows',
  'nodeunit',
  'unit.js'
]

module.exports = testsApi
module.exports.testFrameworks = testFrameworks

function testsApi (modulePath, modulePkg) {
  return {
    exists: checkTestFiles(modulePath),
    framework: checkTestFramework(modulePkg),
    npmScript: checkTestNpmScript(modulePkg)
  }
}

function checkTestFiles (modulePath) {
  var undf, stat

  try {
    // Check if exists a /test directory
    var testDirPath = path.resolve(modulePath, 'test')
    stat = fs.statSync(testDirPath)
    if (!stat.isDirectory()) {
      throw undf
    }

    // And if this folder has any files or/and directories
    var testFiles = fs.readdirSync(testDirPath)
    if (!testFiles.length > 0) {
      throw undf
    }
  } catch (e) {
    try {
      // If not, fallback and check just for a single test file
      stat = fs.statSync(path.resolve(modulePath, 'test.js'))
      if (!stat.isFile()) {
        throw undf
      }
    } catch (e) {
      return false
    }
  }

  return true
}

function checkTestFramework (modulePkg) {
  var deps = modulePkg.dependencies || {}
  var devDeps = modulePkg.devDependencies || {}

  // Intersect deps and devDeps with testFrameworks
  var intersectDeps = intersection(Object.keys(deps), testFrameworks)
  var intersectDevDeps = intersection(Object.keys(devDeps), testFrameworks)

  return (intersectDeps.length > 0 || intersectDevDeps.length > 0)
}

function checkTestNpmScript (modulePkg) {
  var defaultTestScriptWords = ['echo', 'Error', 'exit']
  var scripts = modulePkg.scripts

  var foundScripts = []

  Object.keys(scripts).forEach(function (script) {
    if (~script.indexOf('test')) {
      foundScripts.push(script)
    }
  })

  return foundScripts.some(function (s) {
    var script = scripts[s]

    // Check for default test script
    return !defaultTestScriptWords.every(function (word) {
      return !!~script.indexOf(word)
    })
  })
}

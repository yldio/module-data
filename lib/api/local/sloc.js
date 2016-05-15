var execSync = require('child_process').execSync

module.exports = slocApi

function slocApi (modulePath) {
  var stdout = execSync('node_modules/.bin/sloc . ' +
    '--exclude "node_modules|examples|example|test|tests" ' +
    '--format json')
    .toString()

  var sloc
  try {
    sloc = JSON.parse(stdout)
  } catch (e) {
    return 0
  }

  var summary = sloc.summary || {}

  return summary.total || 0
}

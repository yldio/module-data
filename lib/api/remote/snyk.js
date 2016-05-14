var snykTest = require('snyk/cli/commands/test')

module.exports = SnykApi

function SnykApi (mdlName) {
  this.moduleName = mdlName
}

SnykApi.prototype.test = function (cb) {
  var self = this

  return function (next) {
    var data

    return snykTest(self.moduleName, { json: true })
      .then(response)
      .catch(response)
      .catch(function (err) {
        return next(err)
      })
      .then(function () {
        return cb(next, data)
      })

    function response (res) {
      if (res.message) {
        res = res.message
      }

      data = res
    }
  }
}

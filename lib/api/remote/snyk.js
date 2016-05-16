var snykTest = require('snyk/cli/commands/test')

module.exports = SnykApi

function SnykApi (mdlName) {
  this.moduleName = mdlName
}

SnykApi.prototype.test = function (cb) {
  var self = this

  return function (next) {
    var data, errCalled

    return snykTest(self.moduleName, { json: true })
      .then(response)
      .catch(response)
      .catch(function (err) {
        errCalled = true
        return next(err)
      })
      .then(function () {
        if (!errCalled) {
          return cb(next, data)
        }
      })

    function response (res) {
      if (res.message) {
        res = res.message
      }

      try {
        res = JSON.parse(res)
      } catch (e) {
        throw new Error('Unknown package version - ' + self.moduleName)
      }

      data = res
    }
  }
}

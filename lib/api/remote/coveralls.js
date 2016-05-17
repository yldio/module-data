var request = require('request')
var url = require('url')

module.exports = CoverallsApi

function CoverallsApi (moduleHandle) {
  this.moduleHandle = moduleHandle
}

// Get coveralls report
CoverallsApi.prototype.report = function (cb) {
  var self = this

  return function (next) {
    request({
      method: 'GET',
      uri: url.resolve('https://coveralls.io', 'github/' + self.moduleHandle + '.json'),
      json: true
    }, function (err, res) {
      if (err) {
        return next(err)
      }

      if (res.statusCode === 404) {
        return cb(next, {
          covered_percent: 0
        })
      }

      cb(next, res.body)
    })
  }
}

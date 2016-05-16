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
      if (err || res.statusCode !== 200) {
        return next(err || new Error((res.body && res.body.message) ? res.body.message : 'Unknown error'))
      }

      cb(next, res.body)
    })
  }
}

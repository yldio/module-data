var request = require('request')

function NpmApi (moduleName) {
  this.moduleName = moduleName
}

NpmApi.prototype.view = function (cb) {
  var self = this

  return function (next) {
    request({
      method: 'GET',
      uri: 'http://registry.npmjs.org/' + self.moduleName,
      json: true
    }, function (err, res) {
      if (err || Object.keys(res.body).length < 1) {
        return next(err || new Error('Module not found'))
      }

      return cb(next, res.body)
    })
  }
}

NpmApi.prototype.lastMonthDownloads = function (cb) {
  var self = this

  return function (next) {
    request({
      method: 'GET',
      uri: 'https://api.npmjs.org/downloads/point/last-month/' + self.moduleName,
      json: true
    }, function (err, res) {
      if (err || res.body.error || !res.body.downloads) {
        return next(err || new Error(res.body.error))
      }

      return cb(next, res.body.downloads || 0)
    })
  }
}

NpmApi.prototype.getDependents = function (cb) {
  var self = this

  return function (next) {
    request({
      method: 'GET',
      uri: 'http://registry.npmjs.org/-/_view/dependedUpon?group_level=2&startkey=%5B%22' +
        self.moduleName + '%22%5D&endkey=%5B%22' + self.moduleName + '%22%2C%7B%7D%5D&skip=0',
      json: true
    }, function (err, res, body) {
      if (err) {
        return next(err)
      }

      // no dependents
      if (!(Array.isArray(body.rows)) || body.rows.length < 1) {
        return cb(next, [])
      }

      var deps = body.rows.map(function (row) {
        // sane check
        if (!(Array.isArray(row.key)) || row.key.length !== 2) {
          return 0
        }

        return row.key[1]
      })

      return cb(next, deps)
    })
  }
}

module.exports = NpmApi

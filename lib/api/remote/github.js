var request = require('request')
var url = require('url')

function ghRequest (token, uri, cb, next) {
  request({
    method: 'GET',
    uri: url.resolve('https://api.github.com', uri),
    headers: {
      'Accept': 'application/vnd.github.v3+jso',
      'User-Agent': 'yldio',
      'Authorization': 'token ' + token
    },
    json: true
  }, function (err, res) {
    if (err || res.statusCode !== 200) {
      return next(err || new Error((res.body && res.body.message) ? res.body.message : 'Unknown error'))
    }

    cb(next, res.body)
  })
}

function GithubApi (handle, token) {
  this.handle = handle
  this.token = token
}

GithubApi.prototype.getInfo = function (cb) {
  var self = this

  return function (next) {
    ghRequest(self.token, '/repos/' + self.handle, cb, next)
  }
}

GithubApi.prototype.getTags = function (cb) {
  var self = this

  return function (next) {
    ghRequest(self.token, '/repos/' + self.handle + '/tags', cb, next)
  }
}

GithubApi.prototype.getContributors = function (cb) {
  var self = this

  return function (next) {
    ghRequest(self.token, '/repos/' + self.handle + '/contributors', cb, next)
  }
}

GithubApi.prototype.getPRs = function (cb) {
  var self = this

  return function (next) {
    ghRequest(self.token, '/repos/' + self.handle + '/pulls', cb, next)
  }
}

module.exports = GithubApi

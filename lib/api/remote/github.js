var request = require('request')
var url = require('url')

function ghRequest (uri, cb, next) {
  request({
    method: 'GET',
    uri: url.resolve('https://api.github.com', uri),
    headers: {
      'Accept': 'application/vnd.github.v3+jso',
      'User-Agent': 'yldio',
      'Authorization': 'token 08ae84b3857d8f26199c0633bacfe422e0cd3087'
    },
    json: true
  }, function (err, res) {
    if (err || res.statusCode !== 200) {
      return next(err || new Error((res.body && res.body.message) ? res.body.message : 'Unknown error'))
    }

    cb(next, res.body)
  })
}

function GithubApi (repoUrl) {
  // TODO validate repoUrl

  // Remove protocol from url
  repoUrl = repoUrl.split('//')[1]

  // Arr pos
  // 1 - domain
  // 2 - owner
  // 3 - repo
  repoUrl = repoUrl.split('/')

  this.owner = repoUrl[1]
  this.repo = repoUrl[2].replace('.git', '')
}

GithubApi.prototype.getInfo = function (cb) {
  var self = this

  return function (next) {
    ghRequest('/repos/' + self.owner + '/' + self.repo, cb, next)
  }
}

GithubApi.prototype.getTags = function (cb) {
  var self = this

  return function (next) {
    ghRequest('/repos/' + self.owner + '/' + self.repo + '/tags', cb, next)
  }
}

GithubApi.prototype.getContributors = function (cb) {
  var self = this

  return function (next) {
    ghRequest('/repos/' + self.owner + '/' + self.repo + '/contributors', cb, next)
  }
}

module.exports = GithubApi

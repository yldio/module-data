var async = require('async')
var NpmApi = require('../api/remote/npm')
var SnykApi = require('../api/remote/snyk')
var dataHandler = require('../data-handler')
var semver = require('semver')
var extend = require('xtend')

module.exports = remote

function remote (mdlName, options, done) {
  options = options || {}
  options = extend({}, options)

  if (typeof mdlName !== 'string') {
    return done(new Error('Module name should be a string.'))
  }
  if (!semver.valid(options.version)) {
    return done(new Error('You need to pass a valid version onto options'))
  }
  options.version = semver.clean(options.version)

  var ref = {
    private: false
  }

  return async.series({
    npm: loadNpmDetails(mdlName, options.version, ref),
    snyk: loadVulnerabilities(mdlName, options.version, ref)
  }, function (err, data) {
    if (err) {
      return done(err)
    }

    var remoteData = dataHandler.initRemoteData(mdlName)

    remoteData.private = ref.private
    remoteData.versions = data.npm.versions

    if (!ref.private) {
      remoteData.versions[options.version].vulnerabilities = data.snyk
    }

    return done(null, remoteData)
  })
}

function loadNpmDetails (mdlName, v, ref) {
  var npm = new NpmApi(mdlName)

  return function (done) {
    return async.series({
      versions: npm.view(function (next, viewObj) {
        viewObj.versions = viewObj.versions || {}

        var versions = {}
        ref.private = (!Object.keys(viewObj).length > 1 || !viewObj.versions[v])

        if (!ref.private) {
          var latestVersion = viewObj['dist-tags'].latest
          versions[v] = {
            isDeprecated: (!!viewObj.versions[v].deprecated),
            isOutdated: semver.eq(latestVersion, v),
            dependencies: viewObj.versions[v].dependencies || {}
          }
        }

        return next(null, versions)
      })
    }, done)
  }
}

function loadVulnerabilities (mdlName, version, ref) {
  var snyk = new SnykApi(mdlName + '@' + version)

  return function (done) {
    if (ref.private) {
      return done(null, [])
    }

    snyk.test(function (next, data) {
      var vulns = data.vulnerabilities || []

      vulns = vulns.map(function (vuln) {
        return {
          id: vuln.id,
          url: 'https://snyk.io/vuln/' + vuln.id
        }
      })

      return done(null, vulns)
    })(done)
  }
}

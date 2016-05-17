var async = require('async')
var NpmApi = require('../api/remote/npm')
var GithubApi = require('../api/remote/github')
var CoverallsApi = require('../api/remote/coveralls')
var SnykApi = require('../api/remote/snyk')
var dataHandler = require('../data-handler')
var semver = require('semver')
var url = require('url')

module.exports = remote

function remote (mdlName, options, done) {
  options = options || {}

  if (typeof mdlName !== 'string') {
    return done(new Error('Module name should be a string.'))
  }
  if (!options.githubToken) {
    return done(new Error('Please specify a github API token.'))
  }

  // This variable will be mutated
  // by loadNpmDetails
  var repo = {}

  return async.series({
    npm: loadNpmDetails(mdlName, repo),
    github: loadGithubDetails(repo, options.githubToken),
    coverage: loadCoverageDetails(repo)
  }, function (err, data) {
    if (err) {
      return done(err)
    }

    var remoteData = dataHandler.initRemoteData(mdlName)

    remoteData.github = data.github
    remoteData.publicCoverage = data.coverage
    remoteData.npmInstallsMonth = data.npm.installsMonth

    var versions = data.npm.versions
    var versionsArr = []

    for (var v in versions) {
      var obj = {
        version: v,
        isDeprecated: versions[v].isDeprecated,
        isOutdated: versions[v].isOutdated,
        dependencies: versions[v].dependencies
      }
      versionsArr.push(obj)
    }

    return async.mapSeries(
      versionsArr,
      loadVulnerabilities.bind(null, remoteData.name),
      function (err, versions) {
        if (err) {
          return done(err)
        }

        var versionsObj = {}
        versions.forEach(function (v) {
          versionsObj[v.version] = {
            isDeprecated: v.isDeprecated,
            isOutdated: v.isOutdated,
            dependencies: v.dependencies,
            vulnerabilities: v.vulnerabilities
          }
        })

        remoteData.versions = versionsObj
        return done(null, remoteData)
      }
    )
  })
}

function loadNpmDetails (mdlName, repo) {
  var npm = new NpmApi(mdlName)

  return function (done) {
    return async.series({
      versions: npm.view(function (next, viewObj) {
        repo.handle = parseRepoUrl(viewObj.repository)

        var latestVersion = defineLatestVersion(Object.keys(viewObj.versions))
        var versions = {}

        for (var v in viewObj.versions) {
          versions[v] = {
            isDeprecated: (!!viewObj.versions[v].deprecated),
            isOutdated: semver.eq(latestVersion, v),
            dependencies: viewObj.versions[v].dependencies || {}
          }
        }

        return next(null, versions)
      }),
      installsMonth: npm.lastMonthDownloads(function (next, downloadsCount) {
        return next(null, parseInt(downloadsCount, 10))
      })
    }, done)
  }
}

function defineLatestVersion (versions) {
  var latest = '0.0.0'

  versions.forEach(function (version) {
    if (~version.indexOf('rc')) {
      return
    }

    if (semver.lt(latest, version)) latest = version
  })

  return latest
}

function loadGithubDetails (repo, token) {
  return function (done) {
    if (!repo.handle) {
      return done(null, {
        openPullRequests: -1,
        numOfContributors: -1,
        stars: -1,
        openIssues: -1
      })
    }

    var githubApi = new GithubApi(repo.handle, token)

    return async.series({
      rootInfo: githubApi.getInfo(function (next, body) {
        var info = {
          stars: parseInt(body.stargazers_count, 10) || 0,
          openIssues: parseInt(body.open_issues_count, 10) || 0
        }

        return next(null, info)
      }),
      openPullRequests: githubApi.getPRs(function (next, body) {
        return next(null, body.length)
      }),
      numOfContributors: githubApi.getContributors(function (next, body) {
        return next(null, body.length)
      })
    }, function (err, res) {
      if (err) {
        return done(err)
      }

      var ghInfo = {
        openPullRequests: res.openPullRequests,
        numOfContributors: res.numOfContributors,
        stars: res.rootInfo.stars,
        openIssues: res.rootInfo.openIssues
      }

      return done(null, ghInfo)
    })
  }
}

function loadCoverageDetails (repo) {
  return function (done) {
    if (!repo.handle) {
      return done(null, 0)
    }

    var coveralls = new CoverallsApi(repo.handle)

    coveralls.report(function (next, body) {
      return done(null, parseFloat(body.covered_percent) || 0)
    })(done)
  }
}

// For now support only github repositories
// https://docs.npmjs.com/files/package.json#repository
function parseRepoUrl (repo) {
  // shorthand
  if (typeof repo === 'string') {
    var rgx = /gist:|bitbucket:|gitlab:/g
    if (repo.match(rgx)) {
      return null
    }

    return repo
  } else {
    repo.url = repo.url || ''

    if (repo.type === 'svn' || !repo.url.match(/github\.com/g)) {
      return null
    }

    var repoHandle = url.parse(repo.url)
    repoHandle = repoHandle.path.replace('.git', '')

    if (repoHandle[0] === '/') {
      repoHandle = repoHandle.substr(1)
    }

    return repoHandle
  }
}

function loadVulnerabilities (mdlName, versionObj, done) {
  var snyk = new SnykApi(mdlName + '@' + versionObj.version)

  snyk.test(function (next, data) {
    var vulns = data.vulnerabilities || []

    vulns = vulns.map(function (vuln) {
      return {
        id: vuln.id,
        url: 'https://snyk.io/vuln/' + vuln.id
      }
    })

    versionObj.vulnerabilities = vulns

    return done(null, versionObj)
  })(function () {
    versionObj.vulnerabilities = []

    return done(null, versionObj)
  })
}

var NpmApi = require('./remote-api/npm')
var GithubApi = require('./remote-api/github')
var CoverallsApi = require('./remote-api/coveralls')
var async = require('async')
var moment = require('moment')
var semver = require('semver')

module.exports = ModuleData

function ModuleData (mdl) {
  if (typeof mdl === 'string') {
    if (mdl.match(/@/g)) {
      mdl = mdl.split('@')
      this.version = mdl[1]
      this.moduleName = mdl[0]
    } else {
      this.version = 'latest'
      this.moduleName = mdl
    }
  } else {
    // This will define new props
    this.parseModuleDataObj(mdl)
  }
}

function defineLatestVersion (versionsObj) {
  var latest = '0.0.0'

  for (var version in versionsObj) {
    if (semver.lt(latest, version)) latest = version
  }

  return latest || null
}

// TODO for now support only github repositories
// https://docs.npmjs.com/files/package.json#repository
function parseRepoUrl (repo) {
  // shorthand
  if (typeof repo === 'string') {
    var rgx = /gist:|bitbucket:|gitlab:/g
    if (repo.match(rgx)) {
      return null
    }

    return 'https://github.com/' + repo + '.git'
  } else {
    repo.url = repo.url || ''

    if (repo.type === 'svn' || !repo.url.match(/github\.com/g)) {
      return null
    }

    return repo.url
  }
}

ModuleData.prototype.loadDetails = function (done) {
  var self = this

  this.__dataSource(function (err, mdlData) {
    if (err) {
      return done(err)
    }

    // If there isn't any data from the data source
    // get data from npm and github services
    if (!mdlData) {
      return async.series([
        function (next) {
          self.loadNpmDetails(next)
        },

        function (next) {
          self.loadGithubDetails(next)
        }
      ], done)
    }

    for (var key in mdlData) {
      self[key] = mdlData[key]
    }

    done()
  })
}

ModuleData.prototype.loadNpmDetails = function (loadNext) {
  var self = this

  var npm = new NpmApi(this.moduleName)

  async.series([
    npm.view(function (next, viewObj) {
      if (self.version === 'latest') {
        self.version = defineLatestVersion(viewObj.versions)
      }

      // sane check
      if (!viewObj.versions[self.version]) {
        return next(new Error('Invalid package version'))
      }

      viewObj.time = viewObj.time || {}

      // Package general info
      self.versionsList = {}
      self.outdated = false
      for (var v in viewObj.time) {
        if (v === 'modified' || v === 'created') continue

        self.versionsList[v] = moment(viewObj.time[v])

        if (!self.outdated && semver.gt(v, self.version)) self.outdated = true
      }
      self.readme = viewObj.readmeFilename
      self.license = viewObj.license || false
      self.modified = viewObj.time.modified
      self.created = viewObj.time.created
      self.deprecated = (viewObj.deprecated) || false

      // Get package specific version info
      self.pkg = viewObj.versions[self.version]
      self.description = self.pkg.description
      self.keywords = self.pkg.keywords
      self.homepage = self.pkg.homepage
      self.repo_url = parseRepoUrl(self.pkg.repository)

      if (self.repo_url === null) {
        return next(new Error('Invalid repository url or repository version control not supported.'))
      }

      next()
    }),

    npm.lastMonthDownloads(function (next, downloadsCount) {
      self.installs = parseInt(downloadsCount, 10)

      next()
    }),

    npm.getDependents(function (next, deps) {
      self.dependents = deps

      next()
    })
  ], loadNext)
}

ModuleData.prototype.loadGithubDetails = function (loadNext) {
  var self = this

  self.github = {}
  var githubApi = new GithubApi(self.repo_url)

  async.series([
    githubApi.getInfo(function (next, body) {
      self.github.stars = parseInt(body.stargazers_count, 10) || 0
      next()
    }),

    githubApi.getContributors(function (next, body) {
      self.github.contributors = []

      // sane check
      if (!Array.isArray(body)) {
        return next()
      }

      self.github.contributors = body.map(function (v) {
        return v.login
      })

      next()
    }),

    githubApi.getTags(function (next, body) {
      self.github.tags = []

      // sane check
      if (!Array.isArray(body)) {
        return next()
      }

      self.github.tags = body.map(function (v) {
        return semver.clean(v.name)
      })

      next()
    })
  ], loadNext)
}

// return { date: [moment obj], version: [semver]}
ModuleData.prototype.getLatestRelease = function () {
  var latest = '0.0.0'

  for (var v in this.versionsList) {
    if (semver.lt(latest, v)) latest = v
  }

  return {
    version: latest,
    date: this.versionsList[latest]
  }
}

// return { date: [moment obj], version: [semver]}
ModuleData.prototype.getFirstRelease = function () {
  var first = '999.999.999'

  for (var v in this.versionsList) {
    if (semver.gt(first, v)) first = v
  }

  return {
    version: first,
    date: this.versionsList[first]
  }
}

ModuleData.prototype.loadDataSource = function (dataSource) {
  Object.defineProperty(this, '__dataSource', {
    value: dataSource
  })
}

ModuleData.prototype.loadWhiteListOfLicenses = function (licensesWhiteList) {
  Object.defineProperty(this, '__licensesWhiteList', {
    value: licensesWhiteList
  })
}

ModuleData.prototype.parseModuleDataObj = function (mdlData) {

}

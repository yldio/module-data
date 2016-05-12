var Joi = require('joi')
var spdxLicenseIds = require('spdx-license-ids')
var knownTestFrameworks = require('./lib/local/tests').testFrameworks

var semverRegex = /([0-9]+)\.([0-9]+)\.([0-9]+)(?:(\-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-\-\.]+)?/g

// Verify merged remote and local data
function verify () {
  // TODO
}

var remoteDataSchema = Joi.object().keys({
  name: Joi.string().required(),
  publicCoverage: Joi.number().required(),
  github: Joi.object().keys({
    openIssues: Joi.number().integer().required(),
    openPullRequests: Joi.number().integer().required(),
    numOfContributors: Joi.number().integer().required(),
    stars: Joi.number().integer().required()
  }).required(),
  npmInstallsMonth: Joi.number().integer().required(),
  versions: Joi.object().pattern(
    semverRegex,
    Joi.object().keys({
      dependencies: Joi.object().required(),
      isOutdated: Joi.boolean().required(),
      isDeprecated: Joi.boolean().required(),
      vulnerabilities: Joi.array().items(Joi.object())
    })
  ),
  __moduleData: Joi.object().keys({
    version: Joi.string().regex(semverRegex).required(),
    type: Joi.string().valid('remote').required()
  })
})

var localDataSchema = Joi.object().keys({
  name: Joi.string().required(),
  version: Joi.string().regex(semverRegex).required(),
  sloc: Joi.number().integer().required(),
  tests: Joi.object().keys({
    exists: Joi.boolean().required(),
    framework: Joi.string().valid(knownTestFrameworks).required(),
    npmScript: Joi.boolean().required()
  }),
  license: Joi.string().valid(spdxLicenseIds).required(),
  __moduleData: Joi.object().keys({
    version: Joi.string().regex(semverRegex).required(),
    type: Joi.string().valid('remote').required()
  })
})

module.exports = verify
module.exports.schemas = {
  local: localDataSchema,
  remote: remoteDataSchema
}

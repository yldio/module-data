var Joi = require('joi')
var spdxLicenseIds = require('spdx-license-ids')
var knownTestFrameworks = require('./lib/api/local/tests').testFrameworks

var versionRegex = /([0-9]+)\.([0-9]+)\.([0-9]+)(?:(\-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-\-\.]+)?/g
var mdlRegex = /(\w|\d)+@([0-9]+)\.([0-9]+)\.([0-9]+)(?:(\-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-\-\.]+)?/g

var vulnerabilitiesObj = Joi.object().keys({
  id: Joi.string().required(),
  url: Joi.string().uri({
    scheme: ['http', 'https']
  }).required()
})

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
    versionRegex,
    Joi.object().keys({
      dependencies: Joi.object().required(),
      isOutdated: Joi.boolean().required(),
      isDeprecated: Joi.boolean().required(),
      vulnerabilities: Joi.array().required()
        .items(vulnerabilitiesObj)
    })
  ),
  __moduleData: Joi.object().keys({
    version: Joi.string().regex(versionRegex).required(),
    type: Joi.string().valid('remote').required()
  })
})

var localDataSchema = Joi.object().keys({
  name: Joi.string().required(),
  version: Joi.string().regex(versionRegex).required(),
  sloc: Joi.number().integer().required(),
  tests: Joi.object().keys({
    exists: Joi.boolean().required(),
    framework: Joi.string().valid(knownTestFrameworks).required(),
    npmScript: Joi.boolean().required()
  }),
  license: Joi.string().valid(spdxLicenseIds).required(),
  dependencies: Joi.object().required()
    .pattern(mdlRegex, Joi.object()),
  __moduleData: Joi.object().keys({
    version: Joi.string().regex(versionRegex).required(),
    type: Joi.string().valid('local').required()
  })
})

var standardDataSchema = Joi.object().keys({
  name: Joi.string().required(),
  version: Joi.string().regex(versionRegex).required(),
  sloc: Joi.number().integer().required(),
  tests: Joi.object().keys({
    exists: Joi.boolean().required(),
    framework: Joi.string().valid(knownTestFrameworks).required(),
    npmScript: Joi.boolean().required()
  }),
  license: Joi.string().valid(spdxLicenseIds).required(),
  dependencies: Joi.object().required()
    .pattern(mdlRegex, Joi.object()),
  moduleStats: Joi.object().keys({
    publicCoverage: Joi.number().required(),
    github: Joi.object().keys({
      openIssues: Joi.number().integer().required(),
      openPullRequests: Joi.number().integer().required(),
      numOfContributors: Joi.number().integer().required(),
      stars: Joi.number().integer().required()
    }).required(),
    npmInstallsMonth: Joi.number().integer().required()
  }),
  isOutdated: Joi.boolean().required(),
  isDeprecated: Joi.boolean().required(),
  vulnerabilities: Joi.array().required()
    .items(vulnerabilitiesObj),
  __moduleData: Joi.object().keys({
    version: Joi.string().regex(versionRegex).required(),
    type: Joi.string().valid('standard').required()
  })
})

module.exports = {
  local: localDataSchema,
  remote: remoteDataSchema,

  // Both local and remote merged into a
  // standard data schema
  standard: standardDataSchema
}

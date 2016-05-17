var Joi = require('joi')
var licenseList = require('./lib/license-list')

var versionRegex = /([0-9]+)\.([0-9]+)\.([0-9]+)(?:(\-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-\-\.]+)?/g
var anything = /\w|\d/g

var vulnerabilitiesObj = Joi.object().keys({
  id: Joi.string().required(),
  url: Joi.string().uri({
    scheme: ['http', 'https']
  }).required()
})

var remoteDataSchema = Joi.object().keys({
  name: Joi.string().required(),
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
  sloc: Joi.object().keys({
    real: Joi.number().integer().required(),
    pkg: Joi.number().integer().required()
  }),
  tests: Joi.object().keys({
    exists: Joi.boolean().required(),
    framework: Joi.boolean().required(),
    npmScript: Joi.boolean().required()
  }),
  license: Joi.string().valid(licenseList).required(),
  dependencies: Joi.object().required()
    .pattern(anything, Joi.object()),
  __moduleData: Joi.object().keys({
    version: Joi.string().regex(versionRegex).required(),
    type: Joi.string().valid('local').required()
  })
})

var standardDataSchema = Joi.object().keys({
  name: Joi.string().required(),
  version: Joi.string().regex(versionRegex).required(),
  sloc: Joi.object().keys({
    real: Joi.number().integer().required(),
    pkg: Joi.number().integer().required()
  }),
  tests: Joi.object().keys({
    exists: Joi.boolean().required(),
    framework: Joi.boolean().required(),
    npmScript: Joi.boolean().required()
  }),
  license: Joi.string().valid(licenseList).required(),
  dependencies: Joi.object().required()
    .pattern(anything, Joi.object()),
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

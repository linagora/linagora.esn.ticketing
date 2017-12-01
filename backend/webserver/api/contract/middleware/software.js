'use strict';

const composableMw = require('composable-middleware');

module.exports = (dependencies, lib) => {
  const { validateObjectIds } = require('../../helpers')(dependencies, lib);
  const {
    send400Error,
    send500Error
  } = require('../../utils')(dependencies);

  return {
    validateSoftware
  };

  function validateSoftware(req, res, next) {
    const middlewares = [
      validateSoftwareFormat,
      checkSoftwareTypesAvailable,
      checkDuplicatedSoftware,
      checkSoftwareAvailable,
      checkSoftwareVersionsAvailable
    ];

    return composableMw(...middlewares)(req, res, next);
  }

  function validateSoftwareFormat(req, res, next) {
    const { template, type, versions } = req.body;

    if (!validateObjectIds(template)) {
      return send400Error('Software not found', res);
    }

    if (!versions) {
      return send400Error('Software versions is required', res);
    }

    if (!Array.isArray(versions) || versions.length === 0) {
      return send400Error('Software versions must not be empty', res);
    }

    if (!type) {
      return send400Error('Software type is required', res);
    }

    next();
  }

  function checkDuplicatedSoftware(req, res, next) {
    const { template } = req.body;
    const availableSoftwareIds = req.contract.software.map(item => item.template.toString());

    if (availableSoftwareIds.indexOf(template) > -1) {
      return send400Error('Software already exists', res);
    }

    next();
  }

  function checkSoftwareAvailable(req, res, next) {
    const { template } = req.body;

    lib.software.isSoftwareAvailable(template)
      .then(isAvailable => {
        if (!isAvailable) {
          return send400Error('Software is not available', res);
        }

        next();
      })
      .catch(err => send500Error('Unable to check software', err, res));
  }

  function checkSoftwareVersionsAvailable(req, res, next) {
    const { template, versions } = req.body;

    lib.software.isSoftwareVersionsAvailable(template, versions)
      .then(isAvailable => {
        if (!isAvailable) {
          return send400Error('Software versions are unsupported', res);
        }

        next();
      })
      .catch(err => send500Error('Unable to check software versions', err, res));
  }

  function checkSoftwareTypesAvailable(req, res, next) {
    const { type } = req.body;

    const availableTypes = req.contract.demands.map(demand => demand.softwareType);

    if (availableTypes.indexOf(type) === -1) {
      return send400Error('Software type is unsupported', res);
    }

    next();
  }
};

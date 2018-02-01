'use strict';

const Q = require('q');
const composableMw = require('composable-middleware');
const _ = require('lodash');

module.exports = (dependencies, lib) => {
  const {
    buildUserDisplayName,
    requireAdministrator,
    validateObjectIds
  } = require('../helpers')(dependencies, lib);
  const { send400Error, send404Error, send500Error } = require('../utils')(dependencies);
  const UPDATE_METHODS = ['POST'];

  return {
    loadTicketToUpdate,
    loadContract,
    canCreateTicket,
    canListTicket,
    canReadTicket,
    canUpdateTicket,
    validateTicketCreation,
    validateTicketUpdate
  };

  function canCreateTicket(req, res, next) {
    return requireAdministrator(req, res, next);
  }

  function canListTicket(req, res, next) {
    return requireAdministrator(req, res, next);
  }

  function canReadTicket(req, res, next) {
    return requireAdministrator(req, res, next);
  }

  function canUpdateTicket(req, res, next) {
    return requireAdministrator(req, res, next);
  }

  function loadTicketToUpdate(req, res, next) {
    const populations = [
      {
        path: 'contract',
        select: 'software demands',
        populate: {
          path: 'software.template',
          select: 'name'
        }
      },
      {
        path: 'requester',
        select: 'firstname lastname'
      },
      {
        path: 'supportTechnicians',
        select: 'firstname lastname'
      },
      {
        path: 'supportManager',
        select: 'firstname lastname'
      },
      {
        path: 'software.template',
        select: 'name'
      }
    ];

    lib.ticket.getById(req.params.id, { populations })
      .then(ticket => {
        if (!ticket) {
          return send404Error('Ticket not found', res);
        }

        req.ticket = ticket;
        next();
      })
      .catch(err => send500Error('Failed to load ticket', err, res));
  }

  function loadContract(req, res, next) {
    if (!req.body.contract) {
      return send400Error('contract is required', res);
    }

    if (!validateObjectIds(req.body.contract)) {
      return send400Error('contract is invalid', res);
    }

    lib.contract.getById(req.body.contract)
      .then(contract => {
        if (!contract) {
          return send400Error('contract not found', res);
        }

        req.contract = contract;
        next();
      })
      .catch(err => send500Error('Unable to check contract', err, res));
  }

  function validateTicketCreation(req, res, next) {
    const {
      title,
      demandType,
      description,
      attachments
    } = req.body;

    if (!title) {
      return send400Error('title is required', res);
    }

    if (!demandType) {
      return send400Error('demandType is required', res);
    }

    if (!description) {
      return send400Error('description is required', res);
    }

    if (attachments && (!Array.isArray(attachments) || !validateObjectIds(attachments))) {
      return send400Error('Attachments are invalid', res);
    }

    return _validateTicketBasicInfo(req, res, next);
  }

  function validateTicketUpdate(req, res, next) {
    if (!req.query.action) {
      return composableMw(
        _validateTicketBasicInfo,
        _validateTicketRequester,
        _validateTicketSupportManager,
        _validateTicketSupportTechnicians
       )(req, res, next);
    }

    if (Object.values(lib.constants.TICKET_ACTIONS).indexOf(req.query.action) === -1) {
      return send400Error(`Action ${req.query.action} is not supported`, res);
    }

    if (req.query.action === lib.constants.TICKET_ACTIONS.updateState) {
      return _validateTicketState(req, res, next);
    }

    if (Object.values(lib.constants.TICKET_SETTABLE_TIMES).indexOf(req.query.field) === -1) {
      return send400Error(`${req.query.field} time is not able to set`, res);
    }

    if (req.query.action === lib.constants.TICKET_ACTIONS.set && req.ticket.times && req.ticket.times[req.query.field]) {
      return send400Error(`Field ${req.query.field} already set`, res);
    }

    next();
  }

  function _validateTicketBasicInfo(req, res, next) {
    const {
      title,
      demandType,
      severity,
      software,
      description,
      environment,
      requester,
      supportManager
    } = req.body;
    const contract = req.contract || req.ticket.contract;

    if ('title' in req.body && !title) {
      return send400Error('title is required', res);
    }

    if ('demandType' in req.body && !demandType) {
      return send400Error('demandType is required', res);
    }

    if ('description' in req.body && !description) {
      return send400Error('description is required', res);
    }

    if ('requester' in req.body && !requester) {
      return send400Error('requester is required', res);
    }

    if ('supportManager' in req.body && !supportManager) {
      return send400Error('supportManager is required', res);
    }

    if (description && (typeof description !== 'string' || description.length < 50)) {
      return send400Error('description must be a string with minimum length of 50', res);
    }

    if (environment && typeof environment !== 'string') {
      return send400Error('environment must be a string', res);
    }

    if (software && !_.isEmpty(software)) {
      if (!software.template || !software.version || !software.criticality) {
        return send400Error('software is invalid: template, version and criticality are required', res);
      }

      if (!_validateSoftware(software, contract.software)) {
        return send400Error('The pair (software template, software version) is not supported', res);
      }
    }

    if (!_validateDemand({
      demandType: demandType || req.ticket.demandType,
      severity: severity || req.ticket.severity,
      softwareCriticality: software && software.criticality ? software.criticality : req.ticket.severity
    }, contract.demands)) {
      return send400Error('The triple (demandType, severity, software criticality) is not supported', res);
    }

    next();
  }

  function _validateTicketState(req, res, next) {
    const { state } = req.body;

    if (!state) {
      return send400Error('state is required', res);
    }

    if (!lib.helpers.validateTicketState(state)) {
      return send400Error('state is invalid', res);
    }

    if (req.ticket.state !== lib.constants.TICKET_STATES.NEW && state === lib.constants.TICKET_STATES.NEW) {
      return send400Error('change state of ticket to New is not supported', res);
    }

    next();
  }

  function _validateTicketRequester(req, res, next) {
    const { requester } = req.body;

    if (!requester) {
      return next();
    }

    if (!validateObjectIds(requester)) {
      return send400Error('requester is invalid', res);
    }

    lib.user.getById(requester)
      .then(user => {
        if (!user) {
          return send400Error('requester not found', res);
        }

        if (_isUpdateMethod(req.method) && String(requester) !== String(req.ticket.requester)) {
          req.changeset = req.changeset || [];
          req.changeset.push({
            key: 'requester',
            displayName: 'requester',
            from: buildUserDisplayName(req.ticket.requester),
            to: buildUserDisplayName(user)
          });
        }

        next();
      })
      .catch(err => send500Error('Unable to check requester', err, res));
  }

  function _validateTicketSupportManager(req, res, next) {
    const { supportManager } = req.body;

    if (!supportManager) {
      return next();
    }

    if (!validateObjectIds(supportManager)) {
      return send400Error('supportManager is invalid', res);
    }

    lib.user.getById(supportManager)
      .then(user => {
        if (!user) {
          return send400Error('supportManager not found', res);
        }

        if (_isUpdateMethod(req.method) && String(supportManager) !== String(req.ticket.supportManager)) {
          req.changeset = req.changeset || [];
          req.changeset.push({
            key: 'supportManager',
            displayName: 'support manager',
            from: buildUserDisplayName(req.ticket.supportManager),
            to: buildUserDisplayName(user)
          });
        }

        next();
      })
      .catch(err => send500Error('Unable to check supportManager', err, res));
  }

  function _validateTicketSupportTechnicians(req, res, next) {
    const { supportTechnicians } = req.body;

    if (supportTechnicians) {
      if (!Array.isArray(supportTechnicians) || !validateObjectIds(supportTechnicians)) {
        return send400Error('supportTechnicians is invalid', res);
      }

      return Q.all(supportTechnicians.map(lib.user.getById))
        .then(users => {
          const notFoundUsers = supportTechnicians.filter((userId, index) => !users[index]);

          if (notFoundUsers.length > 0) {
            return send400Error(`supportTechnicians ${notFoundUsers} are not found`, res);
          }

          const buildUserDisplayNames = users => users.map(user => buildUserDisplayName(user));
          const currentSupportTechnicians = req.ticket.supportTechnicians.map(supportTechnician => supportTechnician._id);

          if (_isUpdateMethod(req.method) && _.differenceBy(currentSupportTechnicians, supportTechnicians, String).length > 0) {
            req.changeset = req.changeset || [];
            req.changeset.push({
              key: 'supportTechnicians',
              displayName: 'support technicians',
              from: buildUserDisplayNames(req.ticket.supportTechnicians).join(', '),
              to: buildUserDisplayNames(users).join(', ')
            });
          }

          next();
        })
        .catch(err => send500Error('Unable to check supportTechnicians', err, res));
    }

    next();
  }

  function _validateDemand(demand, availableDemands) {
    return availableDemands.some(item => (item.demandType === demand.demandType) &&
                                         (item.issueType === demand.severity) &&
                                         (item.softwareType === demand.softwareCriticality));
  }

  function _validateSoftware(software, availableSoftware) {
    return availableSoftware.some(item => (String(item.template._id || item.template) === String(software.template)) &&
                                          (item.versions.indexOf(software.version) > -1) &&
                                          (item.type === software.criticality));
  }

  function _isUpdateMethod(method) {
    return UPDATE_METHODS.indexOf(method) !== -1;
  }
};

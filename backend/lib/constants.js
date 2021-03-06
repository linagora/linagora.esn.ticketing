'use strict';

module.exports = {
  TICKETING_USER_ROLES: {
    ADMINISTRATOR: 'administrator',
    USER: 'user',
    SUPPORTER: 'supporter'
  },
  DEFAULT_LIST_OPTIONS: {
    OFFSET: 0,
    LIMIT: 50
  },
  GLOSSARY_CATEGORIES: {
    DEMAND_TYPE: 'Demand type',
    SOFTWARE_TYPE: 'Software type',
    ISSUE_TYPE: 'Issue type'
  },
  TICKET_STATES: {
    NEW: 'New',
    IN_PROGRESS: 'In progress',
    AWAITING: 'Awaiting',
    AWAITING_INFORMATION: 'Awaiting information',
    AWAITING_VALIDATION: 'Awaiting validation',
    CLOSED: 'Closed',
    ABANDONED: 'Abandoned'
  },
  INDICES: {
    CONTRACT: {
      name: 'contracts.idx',
      type: 'contracts'
    },
    ORGANIZATION: {
      name: 'organizations.idx',
      type: 'organizations'
    },
    SOFTWARE: {
      name: 'software.idx',
      type: 'software'
    },
    USER: {
      name: 'ticketing.users.idx',
      type: 'users'
    }
  },
  EVENTS: {
    CONTRACT: {
      created: 'ticketing:contract:created',
      updated: 'ticketing:contract:updated'
    },
    ORGANIZATION: {
      created: 'ticketing:organization:created',
      updated: 'ticketing:organization:updated'
    },
    SOFTWARE: {
      created: 'ticketing:software:created',
      updated: 'ticketing:software:updated'
    },
    TICKET: {
      updated: 'ticketing:ticket:updated'
    },
    USER: {
      created: 'ticketing:user:created',
      updated: 'ticketing:user:updated',
      deleted: 'ticketing:user:deleted'
    }
  },
  TICKET_SETTABLE_TIMES: {
    workaround: 'workaround',
    correction: 'correction'
  },
  TICKET_ACTIVITY: {
    OBJECT_TYPE: 'ticket',
    VERBS: {
      update: 'update',
      set: 'set',
      unset: 'unset'
    }
  },
  NOTIFICATIONS: {
    updated: 'ticketing:notification:ticket:updated'
  }
};

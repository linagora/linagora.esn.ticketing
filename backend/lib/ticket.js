'use strict';

const { DEFAULT_LIST_OPTIONS, TICKET_STATES } = require('./constants');
const { validateTicketState, isSuspendedTicketState } = require('./helpers');

module.exports = dependencies => {
  const mongoose = dependencies('db').mongo.mongoose;
  const Ticket = mongoose.model('Ticket');

  return {
    create,
    list,
    getById,
    updateById,
    updateState,
    setWorkaroundTime,
    setCorrectionTime
  };

  /**
   * Create ticket.
   * @param {Object}  ticket  - The ticket object
   * @param {Object}  options - The options object may contain population options
   * @param {Promise}         - Resolve on success
   */
  function create(ticket, options = {}) {
    ticket = ticket instanceof Ticket ? ticket : new Ticket(ticket);

    return Ticket.create(ticket)
      .then(createdTicket => {
        if (options.populations) {
          return createdTicket.populate(options.populations).execPopulate();
        }

        return createdTicket;
      });
  }

  /**
   * List tickets.
   * @param {Object}  options - The options object, may contain states of ticket, requester, supportManager, supportTechnician, offset and limit
   * @param {Promise}         - Resolve on success
   */
  function list(options = {}) {
    const findOptions = {};

    if (options.states && options.states.length > 0) {
      const states = options.states.filter(state => validateTicketState(state));

      if (states.length === 0) {
        return Promise.resolve([]);
      }

      findOptions.state = { $in: states };
    }

    const orFilter = [];

    if (options.requester) {
      orFilter.push({ requester: options.requester });
    }

    if (options.supportManager) {
      orFilter.push({ supportManager: options.supportManager });
    }

    if (options.supportTechnician) {
      orFilter.push({ supportTechnicians: options.supportTechnician });
    }

    const query = Ticket.find(findOptions);

    if (options.populations) {
      query.populate(options.populations);
    }

    if (orFilter.length > 0) {
      query.or(orFilter);
    }

    query
      .skip(+options.offset || DEFAULT_LIST_OPTIONS.OFFSET)
      .limit(+options.limit || DEFAULT_LIST_OPTIONS.LIMIT)
      .sort('-updatedAt');

    return query.exec();
  }

  /**
   * Get ticket by ID.
   * @param  {String}   ticketId - The ticket ID
   * @return {Promise}           - Resolve the found ticket
   */
  function getById(ticketId, options = {}) {
    const query = Ticket.findById(ticketId);

    if (options.populations) {
      query.populate(options.populations);
    }

    return query.exec();
  }

  /**
   * Update a ticket by ID.
   * @param  {String}   ticketId  - The ticket ID
   * @param  {Object}   modified  - The modified ticket object
   * @return {Promise}            - Resolve the updated ticket
   */
  function updateById(ticketId, modified) {
    return Ticket.findByIdAndUpdate(ticketId, { $set: modified }, { new: true }).exec();
  }

  /**
   * Update state of ticket.
   * @param  {Object}   ticket  - The ticket object
   * @param  {String}   state   - New state
   * @return {Promise}          - Resolve the updated ticket
   */
  function updateState(ticket, state) {
    if (ticket.state === state) {
      return Promise.resolve(ticket);
    }

    ticket.times = ticket.times || {};

    if (state === TICKET_STATES.IN_PROGRESS) {
      if (ticket.times.response === undefined) { // set response time
        ticket.times.response = Math.round((new Date() - ticket.creation) / (1000 * 60) - (ticket.times.suspend || 0)); // in minutes
      }

      if (isSuspendedTicketState(state)) { // accumulate suspend time
        ticket.times.suspend = (ticket.times.suspend || 0) + Math.round((new Date() - ticket.suspendedAt) / (1000 * 60)); // in minutes
      }
    } else if (isSuspendedTicketState(state) && !isSuspendedTicketState(ticket.state)) { // set suspendedAt
      ticket.times.suspendedAt = new Date();
    }

    ticket.state = state;

    return ticket.save();
  }

  /**
   * Set/unset workaround time of ticket.
   * @param  {Object}   ticket  - The ticket object
   * @param  {Boolean}  set     - Flag to determine should set or unset workaround time
   * @return {Promise}          - Resolve the updated ticket
   */
  function setWorkaroundTime(ticket, set) {
    ticket.times = ticket.times || {};

    if (set) {
      ticket.times.workaround = Math.round((new Date() - ticket.creation) / (1000 * 60) - (ticket.times.suspend || 0));
    } else {
      ticket.times.workaround = undefined;
    }

    return ticket.save();
  }

  /**
   * Set/unset correction time of ticket.
   * @param  {Object}   ticket  - The ticket object
   * @param  {Boolean}  set     - Flag to determine should set or unset correction time
   * @return {Promise}          - Resolve the updated ticket
   */
  function setCorrectionTime(ticket, set) {
    ticket.times = ticket.times || {};

    if (set) {
      ticket.times.correction = Math.round((new Date() - ticket.creation) / (1000 * 60) - (ticket.times.suspend || 0));
    } else {
      ticket.times.correction = undefined;
    }

    return ticket.save();
  }
};

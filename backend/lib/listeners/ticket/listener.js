'use strict';

const Q = require('q');

module.exports = dependencies => {
  const pubsubLocal = dependencies('pubsub').local;
  const pubsubGlobal = dependencies('pubsub').global;
  const logger = dependencies('logger');
  const { EVENTS, TICKET_ACTIVITY, NOTIFICATIONS } = require('../../constants');
  const activitystreams = dependencies('activitystreams');

  const ticketUpdatedNotificationTopic = pubsubLocal.topic(NOTIFICATIONS.updated);

  return {
    register
  };

  /**
   * Handler to store a timeline when a ticket event is fired
   * @param {Object}  data  - The data object contains verb, actor and ticket
   * @param {Promise}       - Resolve on done
   */
  function handler(data) {
    const entry = {
      verb: data.verb,
      actor: activitystreams.helpers.getUserAsActor(data.actor),
      object: {
        objectType: TICKET_ACTIVITY.OBJECT_TYPE,
        _id: data.ticketId
      },
      changeset: data.changeset
    };

    return Q.ninvoke(activitystreams, 'addTimelineEntry', entry)
      .then(result => {
        ticketUpdatedNotificationTopic.forward(pubsubGlobal, result[0]);
        logger.debug('timelineEntry has been saved', result);
      })
      .catch(err => logger.error('Error while creating timelineEntry', err));
  }

  function register() {
    Object.values(EVENTS.TICKET).forEach(event => pubsubLocal.topic(event).subscribe(handler));
  }
};

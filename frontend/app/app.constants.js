(function(angular) {
  'use strict';

  angular.module('linagora.esn.ticketing')
    .constant('TICKETING_USER_EVENTS', {
      USER_CREATED: 'ticketing:user:created',
      USER_UPDATED: 'ticketing:user:updated'
    })
    .constant('TICKETING_MODULE_METADATA', {
      id: 'linagora.esn.ticketing',
      title: 'Ticketing',
      homePage: 'ticketing'
    })
    /**
     * Ticketing time units
     * Each unit has:
     * - text: unit's text to display
     * - ratio: unit's ratio is caculated base on hour. Example: 1 day = 24 hours, so ratio of day unit is 24
     * The units must be order by increasement of ratio
     */
    .constant('TICKETING_TIME_UNITS', [
      {
        text: 'minute',
        ratio: 1
      },
      {
        text: 'hour',
        ratio: 60
      },
      {
        text: 'day',
        ratio: 1440
      }
    ]);
})(angular);

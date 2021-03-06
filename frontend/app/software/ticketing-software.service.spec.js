'use strict';

/* global chai: false */
/* global sinon: false */

var expect = chai.expect;

describe('The TicketingSoftwareService', function() {
  var $rootScope, ticketingSoftwareClient, TicketingSoftwareService;
  var TICKETING_SOFTWARE_EVENTS;

  beforeEach(function() {
    module('linagora.esn.ticketing');

    inject(function(
      _$controller_,
      _$rootScope_,
      _ticketingSoftwareClient_,
      _TicketingSoftwareService_,
      _TICKETING_SOFTWARE_EVENTS_
    ) {
      $rootScope = _$rootScope_;
      ticketingSoftwareClient = _ticketingSoftwareClient_;
      TicketingSoftwareService = _TicketingSoftwareService_;
      TICKETING_SOFTWARE_EVENTS = _TICKETING_SOFTWARE_EVENTS_;
    });
  });

  describe('The create function', function() {
    it('should reject if there is no software is provided', function(done) {
      TicketingSoftwareService.create()
        .catch(function(err) {
          expect(err.message).to.equal('Software is required');
          done();
        });
      $rootScope.$digest();
    });

    it('should reject if failed to create software', function(done) {
      var error = new Error('something wrong');
      var software = { foo: 'bar' };

      ticketingSoftwareClient.create = sinon.stub().returns($q.reject(error));
      TicketingSoftwareService.create(software)
        .catch(function(err) {
          expect(ticketingSoftwareClient.create).to.have.been.calledWith(software);
          expect(err.message).to.equal(error.message);
          done();
        });
      $rootScope.$digest();
    });

    it('should fire an event if success to create software', function(done) {
      var software = { foo: 'bar' };

      ticketingSoftwareClient.create = sinon.stub().returns($q.when({ data: software }));
      $rootScope.$broadcast = sinon.spy();
      TicketingSoftwareService.create(software)
        .then(function() {
          expect(ticketingSoftwareClient.create).to.have.been.calledWith(software);
          expect($rootScope.$broadcast).to.have.been.calledWith(TICKETING_SOFTWARE_EVENTS.CREATED, software);
          done();
        });
      $rootScope.$digest();
    });
  });

  describe('The update function', function() {
    it('should reject if there is no software is provided', function(done) {
      TicketingSoftwareService.update()
        .catch(function(err) {
          expect(err.message).to.equal('Software is required');
          done();
        });
      $rootScope.$digest();
    });

    it('should reject if there is no software ID is provided', function(done) {
      TicketingSoftwareService.update({})
        .catch(function(err) {
          expect(err.message).to.equal('Software ID is required');
          done();
        });
      $rootScope.$digest();
    });

    it('should reject if failed to update software', function(done) {
      var error = new Error('something wrong');
      var software = { _id: '1234', foo: 'bar' };

      ticketingSoftwareClient.update = sinon.stub().returns($q.reject(error));

      TicketingSoftwareService.update(software)
        .catch(function(err) {
          expect(ticketingSoftwareClient.update).to.have.been.calledWith(software._id, software);
          expect(err.message).to.equal(error.message);
          done();
        });
      $rootScope.$digest();
    });

    it('should fire an event if success to update software', function(done) {
      var software = { _id: '1234', foo: 'bar' };

      ticketingSoftwareClient.update = sinon.stub().returns($q.when());
      $rootScope.$broadcast = sinon.spy();
      TicketingSoftwareService.update(software)
        .then(function() {
          expect(ticketingSoftwareClient.update).to.have.been.calledWith(software._id, software);
          expect($rootScope.$broadcast).to.have.been.calledWith(TICKETING_SOFTWARE_EVENTS.UPDATED, software);
          done();
        }, function(err) {
          done(err || 'should resolve');
        });
      $rootScope.$digest();
    });
  });
});

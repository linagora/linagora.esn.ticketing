'use strict';

const request = require('supertest');
const expect = require('chai').expect;

describe('POST /ticketing/api/tickets/:id?action="updateState"', function() {
  const API_PATH = '/ticketing/api/tickets';
  let app, lib, helpers;
  let supporter, customSupporter, user1, organization, demand1, demand2, software, contract, ticket;
  const password = 'secret';
  const description = 'fooooooooooooooooooooooooooooooooooooooooooooooooo';

  beforeEach(function(done) {
    app = this.app;
    lib = this.lib;
    helpers = this.helpers;

    const customSupporterJSON = {
      firstname: 'supporter custom',
      lastname: 'supporter custom',
      accounts: [{
        type: 'email',
        emails: ['supportercustom@tic.org'],
        hosted: true
      }],
      main_phone: '77777',
      role: 'supporter',
      password
    };

    const fixtures = require('../../../fixtures/deployments');

    helpers.initUsers([...fixtures.ticketingUsers(), customSupporterJSON])
      .then(createdUsers => {
        supporter = createdUsers[1];
        user1 = createdUsers[2];
        customSupporter = createdUsers[4];
        done();
      })
      .catch(err => done(err));
  });

  beforeEach(function(done) {
    demand1 = {
      demandType: 'Info1',
      softwareType: 'Normal1',
      issueType: 'Blocking1'
    };
    demand2 = {
      demandType: 'Info2',
      softwareType: 'Normal2',
      issueType: 'Blocking2'
    };

    lib.software.create({
      name: 'software1',
      category: 'category1',
      versions: ['1', '2', '3']
    })
    .then(createdSofware => { software = createdSofware; })
    .then(() =>
      lib.organization.create({
        shortName: 'organization'
      })
      .then(createOrganization => (organization = createOrganization))
    )
    .then(() =>
      lib.contract.create({
        title: 'contract',
        organization: organization._id,
        defaultSupportManager: supporter._id,
        startDate: new Date(),
        endDate: new Date(),
        demands: [demand1, demand2],
        software: [{
          template: software._id,
          type: demand1.softwareType,
          versions: ['1', '2']
        }]
      })
      .then(createdContract => (contract = createdContract))
    )
    .then(() =>
      lib.ticket.create({
        contract: contract._id,
        title: 'ticket 1',
        demandType: demand1.demandType,
        severity: demand1.issueType,
        software: {
          template: software._id,
          criticality: demand1.softwareType,
          version: software.versions[0]
        },
        description,
        requester: user1._id,
        supportManager: supporter._id,
        supportTechnicians: [supporter._id]
      })
      .then(createdTicket => {
        ticket = createdTicket;
        done();
      })
    )
    .catch(err => done(err));
  });

  afterEach(function(done) {
    helpers.mongo.dropDatabase(err => done(err));
  });

  it('should respond 401 if not logged in', function(done) {
    helpers.api.requireLogin(app, 'post', `${API_PATH}/${ticket._id}`, done);
  });

  it('should respond 403 if user has user role', function(done) {
    helpers.api.loginAsUser(app, user1.emails[0], password, helpers.callbacks.noErrorAnd(requestAsMember => {
      const req = requestAsMember(request(app).post(`${API_PATH}/${ticket._id}`));

      req.query({ action: 'updateState' });
      req.expect(403)
        .end(helpers.callbacks.noErrorAnd(res => {
          expect(res.body).to.deep.equal({
            error: { code: 403, message: 'Forbidden', details: `User does not have permission to update ticket: ${ticket._id}` }
          });
          done();
        }));
    }));
  });

  it('should respond 403 if user has supporter role but not support technician or support manager or contract\'s default support manager of ticket', function(done) {
    helpers.api.loginAsUser(app, customSupporter.emails[0], password, helpers.callbacks.noErrorAnd(requestAsMember => {
      const req = requestAsMember(request(app).post(`${API_PATH}/${ticket._id}`));

      req.query({ action: 'updateState' });
      req.expect(403)
        .end(helpers.callbacks.noErrorAnd(res => {
          expect(res.body).to.deep.equal({
            error: { code: 403, message: 'Forbidden', details: `User does not have permission to update ticket: ${ticket._id}` }
          });
          done();
        }));
    }));
  });

  it('should respond 400 if state is not provied', function(done) {
    helpers.api.loginAsUser(app, supporter.emails[0], password, helpers.callbacks.noErrorAnd(requestAsMember => {
      const modifiedTicket = {};
      const req = requestAsMember(request(app).post(`${API_PATH}/${ticket._id}`));

      req.query({ action: 'updateState' });
      req.send(modifiedTicket);
      req.expect(400)
        .end(helpers.callbacks.noErrorAnd(res => {
          expect(res.body).to.deep.equal({
            error: { code: 400, message: 'Bad Request', details: 'state is required' }
          });
          done();
        }));
    }));
  });

  it('should respond 400 if state is invalid', function(done) {
    helpers.api.loginAsUser(app, supporter.emails[0], password, helpers.callbacks.noErrorAnd(requestAsMember => {
      const modifiedTicket = { state: 'invalid-state' };
      const req = requestAsMember(request(app).post(`${API_PATH}/${ticket._id}`));

      req.query({ action: 'updateState' });
      req.send(modifiedTicket);
      req.expect(400)
        .end(helpers.callbacks.noErrorAnd(res => {
          expect(res.body).to.deep.equal({
            error: { code: 400, message: 'Bad Request', details: 'state is invalid' }
          });
          done();
        }));
    }));
  });

  it('should respond 400 if change state to "New"', function(done) {
    helpers.api.loginAsUser(app, supporter.emails[0], password, helpers.callbacks.noErrorAnd(requestAsMember => {
      lib.ticket.create({
        state: 'In progress',
        contract: contract._id,
        title: 'ticket 1',
        demandType: demand1.demandType,
        severity: demand1.issueType,
        software: {
          template: software._id,
          criticality: demand1.softwareType,
          version: software.versions[0]
        },
        description,
        requester: user1._id,
        supportManager: supporter._id,
        supportTechnicians: [supporter._id]
      })
      .then(createdTicket => {
        const modifiedTicket = { state: 'New' };
        const req = requestAsMember(request(app).post(`${API_PATH}/${createdTicket._id}`));

        req.query({ action: 'updateState' });
        req.send(modifiedTicket);
        req.expect(400)
          .end(helpers.callbacks.noErrorAnd(res => {
            expect(res.body).to.deep.equal({
              error: { code: 400, message: 'Bad Request', details: 'change state of ticket to New is not supported' }
            });
            done();
          }));
      })
      .catch(err => done(err));
    }));
  });

  it('should respond 200 with update ticket', function(done) {
    helpers.api.loginAsUser(app, supporter.emails[0], password, helpers.callbacks.noErrorAnd(requestAsMember => {
      const modifiedTicket = { state: 'Awaiting' };
      const req = requestAsMember(request(app).post(`${API_PATH}/${ticket._id}`));

      req.query({ action: 'updateState' });
      req.send(modifiedTicket);
      req.expect(200)
        .end(helpers.callbacks.noErrorAnd(res => {
          expect(res.body.state).to.equal(modifiedTicket.state);
          done();
        }));
    }));
  });

  it('should set response time if it was not set and state changed to "In progress"', function(done) {
    helpers.api.loginAsUser(app, supporter.emails[0], password, helpers.callbacks.noErrorAnd(requestAsMember => {
      const modifiedTicket = { state: 'In progress' };
      const req = requestAsMember(request(app).post(`${API_PATH}/${ticket._id}`));

      req.query({ action: 'updateState' });
      req.send(modifiedTicket);
      req.expect(200)
        .end(helpers.callbacks.noErrorAnd(res => {
          expect(res.body.state).to.equal(modifiedTicket.state);
          expect(res.body.times.response).to.exist;
          done();
        }));
    }));
  });

  it('should set suspendedAt if state changed to "Awaiting"', function(done) {
    helpers.api.loginAsUser(app, supporter.emails[0], password, helpers.callbacks.noErrorAnd(requestAsMember => {
      const modifiedTicket = { state: 'Awaiting' };
      const req = requestAsMember(request(app).post(`${API_PATH}/${ticket._id}`));

      req.query({ action: 'updateState' });
      req.send(modifiedTicket);
      req.expect(200)
        .end(helpers.callbacks.noErrorAnd(res => {
          expect(res.body.state).to.equal(modifiedTicket.state);
          expect(res.body.times.suspendedAt).to.exist;
          done();
        }));
    }));
  });

  it('should set suspendedAt if state changed to "Awaiting information"', function(done) {
    helpers.api.loginAsUser(app, supporter.emails[0], password, helpers.callbacks.noErrorAnd(requestAsMember => {
      const modifiedTicket = { state: 'Awaiting information' };
      const req = requestAsMember(request(app).post(`${API_PATH}/${ticket._id}`));

      req.query({ action: 'updateState' });
      req.send(modifiedTicket);
      req.expect(200)
        .end(helpers.callbacks.noErrorAnd(res => {
          expect(res.body.state).to.equal(modifiedTicket.state);
          expect(res.body.times.suspendedAt).to.exist;
          done();
        }));
    }));
  });

  it('should set suspendedAt if state changed to "Awaiting validation"', function(done) {
    helpers.api.loginAsUser(app, supporter.emails[0], password, helpers.callbacks.noErrorAnd(requestAsMember => {
      const modifiedTicket = { state: 'Awaiting validation' };
      const req = requestAsMember(request(app).post(`${API_PATH}/${ticket._id}`));

      req.query({ action: 'updateState' });
      req.send(modifiedTicket);
      req.expect(200)
        .end(helpers.callbacks.noErrorAnd(res => {
          expect(res.body.state).to.equal(modifiedTicket.state);
          expect(res.body.times.suspendedAt).to.exist;
          done();
        }));
    }));
  });

  it('should set suspendedAt if state changed to "Closed"', function(done) {
    helpers.api.loginAsUser(app, supporter.emails[0], password, helpers.callbacks.noErrorAnd(requestAsMember => {
      const modifiedTicket = { state: 'Closed' };
      const req = requestAsMember(request(app).post(`${API_PATH}/${ticket._id}`));

      req.query({ action: 'updateState' });
      req.send(modifiedTicket);
      req.expect(200)
        .end(helpers.callbacks.noErrorAnd(res => {
          expect(res.body.state).to.equal(modifiedTicket.state);
          expect(res.body.times.suspendedAt).to.exist;
          done();
        }));
    }));
  });

  it('should set suspend time if state changed from "Awaiting" to "In progress"', function(done) {
    helpers.api.loginAsUser(app, supporter.emails[0], password, helpers.callbacks.noErrorAnd(requestAsMember => {
      lib.ticket.create({
        state: 'Awaiting',
        contract: contract._id,
        title: 'ticket 1',
        demandType: demand1.demandType,
        severity: demand1.issueType,
        software: {
          template: software._id,
          criticality: demand1.softwareType,
          version: software.versions[0]
        },
        description,
        requester: user1._id,
        supportManager: supporter._id,
        supportTechnicians: [supporter._id],
        times: {
          suspendedAt: new Date()
        }
      })
      .then(createdTicket => {
        const modifiedTicket = { state: 'In progress' };
        const req = requestAsMember(request(app).post(`${API_PATH}/${createdTicket._id}`));

        req.query({ action: 'updateState' });
        req.send(modifiedTicket);
        req.expect(200)
          .end(helpers.callbacks.noErrorAnd(res => {
            expect(res.body.state).to.equal(modifiedTicket.state);
            expect(res.body.times.suspend).to.exist;
            done();
          }));
      })
      .catch(err => done(err));
    }));
  });

  it('should set suspend time if state changed from "Awaiting information" to "In progress"', function(done) {
    helpers.api.loginAsUser(app, supporter.emails[0], password, helpers.callbacks.noErrorAnd(requestAsMember => {
      lib.ticket.create({
        state: 'Awaiting information',
        contract: contract._id,
        title: 'ticket 1',
        demandType: demand1.demandType,
        severity: demand1.issueType,
        software: {
          template: software._id,
          criticality: demand1.softwareType,
          version: software.versions[0]
        },
        description,
        requester: user1._id,
        supportManager: supporter._id,
        supportTechnicians: [supporter._id],
        times: {
          suspendedAt: new Date()
        }
      })
      .then(createdTicket => {
        const modifiedTicket = { state: 'In progress' };
        const req = requestAsMember(request(app).post(`${API_PATH}/${createdTicket._id}`));

        req.query({ action: 'updateState' });
        req.send(modifiedTicket);
        req.expect(200)
          .end(helpers.callbacks.noErrorAnd(res => {
            expect(res.body.state).to.equal(modifiedTicket.state);
            expect(res.body.times.suspend).to.exist;
            done();
          }));
      })
      .catch(err => done(err));
    }));
  });

  it('should set suspend time if state changed from "Awaiting validation" to "In progress"', function(done) {
    helpers.api.loginAsUser(app, supporter.emails[0], password, helpers.callbacks.noErrorAnd(requestAsMember => {
      lib.ticket.create({
        state: 'Awaiting validation',
        contract: contract._id,
        title: 'ticket 1',
        demandType: demand1.demandType,
        severity: demand1.issueType,
        software: {
          template: software._id,
          criticality: demand1.softwareType,
          version: software.versions[0]
        },
        description,
        requester: user1._id,
        supportManager: supporter._id,
        supportTechnicians: [supporter._id],
        times: {
          suspendedAt: new Date()
        }
      })
      .then(createdTicket => {
        const modifiedTicket = { state: 'In progress' };
        const req = requestAsMember(request(app).post(`${API_PATH}/${createdTicket._id}`));

        req.query({ action: 'updateState' });
        req.send(modifiedTicket);
        req.expect(200)
          .end(helpers.callbacks.noErrorAnd(res => {
            expect(res.body.state).to.equal(modifiedTicket.state);
            expect(res.body.times.suspend).to.exist;
            done();
          }));
      })
      .catch(err => done(err));
    }));
  });

  it('should set suspend time if state changed from "Closed" to "In progress"', function(done) {
    helpers.api.loginAsUser(app, supporter.emails[0], password, helpers.callbacks.noErrorAnd(requestAsMember => {
      lib.ticket.create({
        state: 'Closed',
        contract: contract._id,
        title: 'ticket 1',
        demandType: demand1.demandType,
        severity: demand1.issueType,
        software: {
          template: software._id,
          criticality: demand1.softwareType,
          version: software.versions[0]
        },
        description,
        requester: user1._id,
        supportManager: supporter._id,
        supportTechnicians: [supporter._id],
        times: {
          suspendedAt: new Date()
        }
      })
      .then(createdTicket => {
        const modifiedTicket = { state: 'In progress' };
        const req = requestAsMember(request(app).post(`${API_PATH}/${createdTicket._id}`));

        req.query({ action: 'updateState' });
        req.send(modifiedTicket);
        req.expect(200)
          .end(helpers.callbacks.noErrorAnd(res => {
            expect(res.body.state).to.equal(modifiedTicket.state);
            expect(res.body.times.suspend).to.exist;
            done();
          }));
      })
      .catch(err => done(err));
    }));
  });
});

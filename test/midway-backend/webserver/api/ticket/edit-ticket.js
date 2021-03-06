'use strict';

const request = require('supertest');
const expect = require('chai').expect;

describe('POST /ticketing/api/tickets/:id', function() {
  const API_PATH = '/ticketing/api/tickets';
  let app, lib, helpers, ObjectId;
  let supporter, customSupporter, user1, organization, demand1, demand2, software, contract, ticket;
  const password = 'secret';
  const description = 'fooooooooooooooooooooooooooooooooooooooooooooooooo';

  beforeEach(function(done) {
    app = this.app;
    lib = this.lib;
    helpers = this.helpers;
    ObjectId = this.testEnv.core.db.mongo.mongoose.Types.ObjectId;

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
      issueType: 'Blocking1',
      responseTime: 1,
      workaroundTime: 2,
      correctionTime: 3
    };
    demand2 = {
      demandType: 'Info2',
      softwareType: 'Normal2',
      issueType: 'Blocking2',
      responseTime: 10,
      workaroundTime: 20,
      correctionTime: 30
    };

    lib.software.create({
      name: 'software',
      category: 'category',
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
          versions: software.versions
        }, {
          template: software._id,
          type: demand2.softwareType,
          versions: software.versions
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
        supportManager: customSupporter._id,
        supportTechnicians: [customSupporter._id]
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

  const getObjectFromModel = document => JSON.parse(JSON.stringify(document)); // Because model object use original type like Bson, Date

  it('should respond 401 if not logged in', function(done) {
    helpers.api.requireLogin(app, 'post', `${API_PATH}/${ticket._id}`, done);
  });

  it('should respond 403 if user has supporter role but not contract\'s support manager of ticket', function(done) {
    helpers.api.loginAsUser(app, customSupporter.emails[0], password, helpers.callbacks.noErrorAnd(requestAsMember => {
      const req = requestAsMember(request(app).post(`${API_PATH}/${ticket._id}`));

      req.expect(403)
        .end(helpers.callbacks.noErrorAnd(res => {
          expect(res.body).to.deep.equal({
            error: { code: 403, message: 'Forbidden', details: `User does not have permission to edit ticket: ${ticket._id}` }
          });
          done();
        }));
    }));
  });

  it('should respond 400 if there is empty title in payload', function(done) {
    helpers.api.loginAsUser(app, supporter.emails[0], password, helpers.callbacks.noErrorAnd(requestAsMember => {
      const modifiedTicket = {
        title: '',
        demandType: demand1.demandType
      };
      const req = requestAsMember(request(app).post(`${API_PATH}/${ticket._id}`));

      req.send(modifiedTicket);
      req.expect(400)
        .end(helpers.callbacks.noErrorAnd(res => {
          expect(res.body).to.deep.equal({
            error: { code: 400, message: 'Bad Request', details: 'title is required' }
          });
          done();
        }));
    }));
  });

  it('should respond 400 if there is empty demandType in payload', function(done) {
    helpers.api.loginAsUser(app, supporter.emails[0], password, helpers.callbacks.noErrorAnd(requestAsMember => {
      const modifiedTicket = {
        title: 'modified title',
        demandType: ''
      };
      const req = requestAsMember(request(app).post(`${API_PATH}/${ticket._id}`));

      req.send(modifiedTicket);
      req.expect(400)
        .end(helpers.callbacks.noErrorAnd(res => {
          expect(res.body).to.deep.equal({
            error: { code: 400, message: 'Bad Request', details: 'demandType is required' }
          });
          done();
        }));
    }));
  });

  it('should respond 400 if there is empty description in payload', function(done) {
    helpers.api.loginAsUser(app, supporter.emails[0], password, helpers.callbacks.noErrorAnd(requestAsMember => {
      const modifiedTicket = {
        title: 'modified title',
        demandType: demand1.demandType,
        description: ''
      };
      const req = requestAsMember(request(app).post(`${API_PATH}/${ticket._id}`));

      req.send(modifiedTicket);
      req.expect(400)
        .end(helpers.callbacks.noErrorAnd(res => {
          expect(res.body).to.deep.equal({
            error: { code: 400, message: 'Bad Request', details: 'description is required' }
          });
          done();
        }));
    }));
  });

  it('should respond 400 if description is not a string', function(done) {
    helpers.api.loginAsUser(app, supporter.emails[0], password, helpers.callbacks.noErrorAnd(requestAsMember => {
      const modifiedTicket = {
        title: 'modified title',
        demandType: demand1.demandType,
        description: []
      };
      const req = requestAsMember(request(app).post(`${API_PATH}/${ticket._id}`));

      req.send(modifiedTicket);
      req.expect(400)
        .end(helpers.callbacks.noErrorAnd(res => {
          expect(res.body).to.deep.equal({
            error: { code: 400, message: 'Bad Request', details: 'description must be a string with minimum length of 50' }
          });
          done();
        }));
    }));
  });

  it('should respond 400 if description is not a string with minimum length of 50', function(done) {
    helpers.api.loginAsUser(app, supporter.emails[0], password, helpers.callbacks.noErrorAnd(requestAsMember => {
      const modifiedTicket = {
        title: 'modified title',
        demandType: 'info',
        description: 'too short description'
      };
      const req = requestAsMember(request(app).post(`${API_PATH}/${ticket._id}`));

      req.send(modifiedTicket);
      req.expect(400)
        .end(helpers.callbacks.noErrorAnd(res => {
          expect(res.body).to.deep.equal({
            error: { code: 400, message: 'Bad Request', details: 'description must be a string with minimum length of 50' }
          });
          done();
        }));
    }));
  });

  it('should respond 400 if environment is not a string', function(done) {
    helpers.api.loginAsUser(app, supporter.emails[0], password, helpers.callbacks.noErrorAnd(requestAsMember => {
      const modifiedTicket = {
        title: 'modified title',
        demandType: 'info',
        description,
        environment: []
      };
      const req = requestAsMember(request(app).post(`${API_PATH}/${ticket._id}`));

      req.send(modifiedTicket);
      req.expect(400)
        .end(helpers.callbacks.noErrorAnd(res => {
          expect(res.body).to.deep.equal({
            error: { code: 400, message: 'Bad Request', details: 'environment must be a string' }
          });
          done();
        }));
    }));
  });

  it('should respond 400 if software is provided but template is not provied', function(done) {
    helpers.api.loginAsUser(app, supporter.emails[0], password, helpers.callbacks.noErrorAnd(requestAsMember => {
      const modifiedTicket = {
        title: 'modified title',
        demandType: demand1.demandType,
        description,
        software: {
          criticality: demand1.softwareType,
          version: software.versions[1]
        }
      };
      const req = requestAsMember(request(app).post(`${API_PATH}/${ticket._id}`));

      req.send(modifiedTicket);
      req.expect(400)
        .end(helpers.callbacks.noErrorAnd(res => {
          expect(res.body).to.deep.equal({
            error: { code: 400, message: 'Bad Request', details: 'software is invalid: template, version and criticality are required' }
          });
          done();
        }));
    }));
  });

  it('should respond 400 if software is provided but version is not provied', function(done) {
    helpers.api.loginAsUser(app, supporter.emails[0], password, helpers.callbacks.noErrorAnd(requestAsMember => {
      const modifiedTicket = {
        software: {
          template: software._id,
          criticality: demand1.softwareType
        }
      };
      const req = requestAsMember(request(app).post(`${API_PATH}/${ticket._id}`));

      req.send(modifiedTicket);
      req.expect(400)
        .end(helpers.callbacks.noErrorAnd(res => {
          expect(res.body).to.deep.equal({
            error: { code: 400, message: 'Bad Request', details: 'software is invalid: template, version and criticality are required' }
          });
          done();
        }));
    }));
  });

  it('should respond 400 if software is provided but criticality is not provied', function(done) {
    helpers.api.loginAsUser(app, supporter.emails[0], password, helpers.callbacks.noErrorAnd(requestAsMember => {
      const modifiedTicket = {
        software: {
          template: software._id,
          version: software.versions[0]
        }
      };
      const req = requestAsMember(request(app).post(`${API_PATH}/${ticket._id}`));

      req.send(modifiedTicket);
      req.expect(400)
        .end(helpers.callbacks.noErrorAnd(res => {
          expect(res.body).to.deep.equal({
            error: { code: 400, message: 'Bad Request', details: 'software is invalid: template, version and criticality are required' }
          });
          done();
        }));
    }));
  });

  it('should respond 400 if the triple (demandType, severity, software criticality) is not supported', function(done) {
    helpers.api.loginAsUser(app, supporter.emails[0], password, helpers.callbacks.noErrorAnd(requestAsMember => {
      const modifiedTicket = {
        title: 'modified title',
        demandType: demand1.demandType,
        severity: 'invalid-severity',
        software: {
          template: software._id,
          criticality: demand1.softwareType,
          version: software.versions[0]
        },
        description
      };

      const req = requestAsMember(request(app).post(`${API_PATH}/${ticket._id}`));

      req.send(modifiedTicket);
      req.expect(400)
        .end(helpers.callbacks.noErrorAnd(res => {
          expect(res.body).to.deep.equal({
            error: { code: 400, message: 'Bad Request', details: 'The triple (demandType, severity, software criticality) is not supported' }
          });
          done();
        }));
    }));
  });

  it('should respond 400 if the pair (software template, software version) is not supported', function(done) {
    helpers.api.loginAsUser(app, supporter.emails[0], password, helpers.callbacks.noErrorAnd(requestAsMember => {
      const modifiedTicket = {
        title: 'modified title',
        demandType: demand1.demandType,
        severity: demand1.issueType,
        software: {
          template: software._id,
          criticality: demand1.softwareType,
          version: 'invalid-version'
        },
        description
      };
      const req = requestAsMember(request(app).post(`${API_PATH}/${ticket._id}`));

      req.send(modifiedTicket);
      req.expect(400)
        .end(helpers.callbacks.noErrorAnd(res => {
          expect(res.body).to.deep.equal({
            error: { code: 400, message: 'Bad Request', details: 'The pair (software template, software version) is not supported' }
          });
          done();
        }));
    }));
  });

  it('should respond 400 if there is a null requester', function(done) {
    helpers.api.loginAsUser(app, supporter.emails[0], password, helpers.callbacks.noErrorAnd(requestAsMember => {
      const modifiedTicket = {
        title: 'modified title',
        demandType: demand1.demandType,
        severity: demand1.issueType,
        software: {
          template: software._id,
          criticality: demand1.softwareType,
          version: software.versions[1]
        },
        description,
        requester: null
      };
      const req = requestAsMember(request(app).post(`${API_PATH}/${ticket._id}`));

      req.send(modifiedTicket);
      req.expect(400)
        .end(helpers.callbacks.noErrorAnd(res => {
          expect(res.body).to.deep.equal({
            error: { code: 400, message: 'Bad Request', details: 'requester is required' }
          });
          done();
        }));
    }));
  });

  it('should respond 400 if requester is invalid', function(done) {
    helpers.api.loginAsUser(app, supporter.emails[0], password, helpers.callbacks.noErrorAnd(requestAsMember => {
      const modifiedTicket = {
        title: 'modified title',
        demandType: demand1.demandType,
        severity: demand1.issueType,
        software: {
          template: software._id,
          criticality: demand1.softwareType,
          version: software.versions[1]
        },
        description,
        requester: 'invalid ObjectId'
      };
      const req = requestAsMember(request(app).post(`${API_PATH}/${ticket._id}`));

      req.send(modifiedTicket);
      req.expect(400)
        .end(helpers.callbacks.noErrorAnd(res => {
          expect(res.body).to.deep.equal({
            error: { code: 400, message: 'Bad Request', details: 'requester is invalid' }
          });
          done();
        }));
    }));
  });

  it('should respond 400 if requester is not found', function(done) {
    helpers.api.loginAsUser(app, supporter.emails[0], password, helpers.callbacks.noErrorAnd(requestAsMember => {
      const modifiedTicket = {
        title: 'modified title',
        demandType: demand1.demandType,
        severity: demand1.issueType,
        software: {
          template: software._id,
          criticality: demand1.softwareType,
          version: software.versions[1]
        },
        description,
        requester: new ObjectId()
      };
      const req = requestAsMember(request(app).post(`${API_PATH}/${ticket._id}`));

      req.send(modifiedTicket);
      req.expect(400)
        .end(helpers.callbacks.noErrorAnd(res => {
          expect(res.body).to.deep.equal({
            error: { code: 400, message: 'Bad Request', details: 'requester not found' }
          });
          done();
        }));
    }));
  });

  it('should respond 400 if there is a null supportManager', function(done) {
    helpers.api.loginAsUser(app, supporter.emails[0], password, helpers.callbacks.noErrorAnd(requestAsMember => {
      const modifiedTicket = {
        title: 'modified title',
        demandType: demand1.demandType,
        severity: demand1.issueType,
        software: {
          template: software._id,
          criticality: demand1.softwareType,
          version: software.versions[1]
        },
        description,
        requester: user1._id,
        supportManager: null
      };
      const req = requestAsMember(request(app).post(`${API_PATH}/${ticket._id}`));

      req.send(modifiedTicket);
      req.expect(400)
        .end(helpers.callbacks.noErrorAnd(res => {
          expect(res.body).to.deep.equal({
            error: { code: 400, message: 'Bad Request', details: 'supportManager is required' }
          });
          done();
        }));
    }));
  });

  it('should respond 400 if supportManager is invalid', function(done) {
    helpers.api.loginAsUser(app, supporter.emails[0], password, helpers.callbacks.noErrorAnd(requestAsMember => {
      const modifiedTicket = {
        title: 'modified title',
        demandType: demand1.demandType,
        severity: demand1.issueType,
        software: {
          template: software._id,
          criticality: demand1.softwareType,
          version: software.versions[1]
        },
        description,
        requester: user1._id,
        supportManager: 'invalid ObjectId'
      };
      const req = requestAsMember(request(app).post(`${API_PATH}/${ticket._id}`));

      req.send(modifiedTicket);
      req.expect(400)
        .end(helpers.callbacks.noErrorAnd(res => {
          expect(res.body).to.deep.equal({
            error: { code: 400, message: 'Bad Request', details: 'supportManager is invalid' }
          });
          done();
        }));
    }));
  });

  it('should respond 400 if supportManager is not found', function(done) {
    helpers.api.loginAsUser(app, supporter.emails[0], password, helpers.callbacks.noErrorAnd(requestAsMember => {
      const modifiedTicket = {
        title: 'modified title',
        demandType: demand1.demandType,
        severity: demand1.issueType,
        software: {
          template: software._id,
          criticality: demand1.softwareType,
          version: software.versions[1]
        },
        description,
        requester: user1._id,
        supportManager: new ObjectId()
      };
      const req = requestAsMember(request(app).post(`${API_PATH}/${ticket._id}`));

      req.send(modifiedTicket);
      req.expect(400)
        .end(helpers.callbacks.noErrorAnd(res => {
          expect(res.body).to.deep.equal({
            error: { code: 400, message: 'Bad Request', details: 'supportManager not found' }
          });
          done();
        }));
    }));
  });

  it('should respond 400 if supportTechnicians is invalid', function(done) {
    helpers.api.loginAsUser(app, supporter.emails[0], password, helpers.callbacks.noErrorAnd(requestAsMember => {
      const modifiedTicket = {
        title: 'modified title',
        demandType: demand1.demandType,
        severity: demand1.issueType,
        software: {
          template: software._id,
          criticality: demand1.softwareType,
          version: software.versions[1]
        },
        description,
        requester: user1._id,
        supportManager: customSupporter._id,
        supportTechnicians: ['invalid ObjectId']
      };
      const req = requestAsMember(request(app).post(`${API_PATH}/${ticket._id}`));

      req.send(modifiedTicket);
      req.expect(400)
        .end(helpers.callbacks.noErrorAnd(res => {
          expect(res.body).to.deep.equal({
            error: { code: 400, message: 'Bad Request', details: 'supportTechnicians is invalid' }
          });
          done();
        }));
    }));
  });

  it('should respond 400 if supportTechnicians are not found', function(done) {
    helpers.api.loginAsUser(app, supporter.emails[0], password, helpers.callbacks.noErrorAnd(requestAsMember => {
      const notFoundTechnician = new ObjectId();
      const modifiedTicket = {
        title: 'modified title',
        demandType: demand1.demandType,
        severity: demand1.issueType,
        software: {
          template: software._id,
          criticality: demand1.softwareType,
          version: software.versions[1]
        },
        description,
        requester: user1._id,
        supportManager: customSupporter._id,
        supportTechnicians: [customSupporter._id, notFoundTechnician]
      };
      const req = requestAsMember(request(app).post(`${API_PATH}/${ticket._id}`));

      req.send(modifiedTicket);
      req.expect(400)
        .end(helpers.callbacks.noErrorAnd(res => {
          expect(res.body).to.deep.equal({
            error: { code: 400, message: 'Bad Request', details: `supportTechnicians ${notFoundTechnician} are not found` }
          });
          done();
        }));
    }));
  });

  it('should respond 200 with updated ticket', function(done) {
    helpers.api.loginAsUser(app, supporter.emails[0], password, helpers.callbacks.noErrorAnd(requestAsMember => {
      const modifiedTicket = {
        title: 'modified title',
        demandType: demand1.demandType,
        severity: demand1.issueType,
        software: {
          template: software._id,
          criticality: demand1.softwareType,
          version: software.versions[0]
        },
        description,
        requester: user1._id,
        supportManager: customSupporter._id,
        supportTechnicians: [supporter._id, customSupporter._id]
      };
      const req = requestAsMember(request(app).post(`${API_PATH}/${ticket._id}`));

      req.send(modifiedTicket);
      req.expect(200)
        .end(helpers.callbacks.noErrorAnd(res => {
          expect(res.body).to.shallowDeepEqual(getObjectFromModel(modifiedTicket));
          done();
        }));
    }));
  });

  it('should respond 200 if success to update ticket with updated SLA times if demand is modified', function(done) {
    helpers.api.loginAsUser(app, supporter.emails[0], password, helpers.callbacks.noErrorAnd(requestAsMember => {
      const modifiedTicket = {
        title: 'modified title',
        demandType: demand2.demandType,
        severity: demand2.issueType,
        software: {
          template: software._id,
          criticality: demand2.softwareType,
          version: software.versions[0]
        },
        description,
        requester: user1._id,
        supportManager: customSupporter._id,
        supportTechnicians: [supporter._id, customSupporter._id]
      };
      const req = requestAsMember(request(app).post(`${API_PATH}/${ticket._id}`));

      req.send(modifiedTicket);
      req.expect(200)
        .end(helpers.callbacks.noErrorAnd(res => {
          expect(res.body).to.shallowDeepEqual(getObjectFromModel(modifiedTicket));
          expect(res.body.times).to.shallowDeepEqual({
            responseSLA: demand2.responseTime,
            workaroundSLA: demand2.workaroundTime,
            correctionTime: demand2.correctionSLA
          });
          done();
        }));
    }));
  });
});

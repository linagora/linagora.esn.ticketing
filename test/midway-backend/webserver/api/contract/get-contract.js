'use strict';

const request = require('supertest');
const path = require('path');
const expect = require('chai').expect;

describe('GET /ticketing/api/contracts/:id', function() {
  let app, lib, helpers;
  let user1, user2, organization, software, contract;
  const password = 'secret';

  beforeEach(function(done) {
    helpers = this.helpers;
    app = this.app;
    lib = this.lib;

    const deployOptions = {
      fixtures: path.normalize(`${__dirname}/../../../fixtures/deployments`)
    };

    helpers.api.applyDomainDeployment('ticketingModule', deployOptions, (err, models) => {
      if (err) {
        return done(err);
      }

      user1 = models.users[1];
      user2 = models.users[2];

      done();
    });
  });

  beforeEach(function(done) {
    lib.ticketingUserRole.create({
      user: user1._id,
      role: 'administrator'
    })
    .then(() =>
      lib.ticketingUserRole.create({
        user: user2._id,
        role: 'user'
      }))
    .then(() =>
      lib.organization.create({
        shortName: 'organization'
      })
      .then(createdOrganization => {
        organization = createdOrganization;
        done();
      }))
    .catch(err => done(err));
  });

  beforeEach(function(done) {
    const softwareJson = {
      active: true,
      name: 'software',
      category: 'category',
      versions: ['1', '2']
    };

    lib.software.create(softwareJson)
      .then(softwareJson => {
        software = softwareJson;
        done();
      })
      .catch(err => done(err));
  });

  beforeEach(function(done) {
    lib.contract.create({
      title: 'contract1',
      organization: organization._id,
      startDate: new Date(),
      endDate: new Date(),
      software: [{
        template: software._id,
        versions: software.versions,
        type: 'Non blocking'
      }]
    })
    .then(createdContract => {
      contract = createdContract;
      done();
    })
    .catch(err => done(err));
  });

  afterEach(function(done) {
    helpers.mongo.dropDatabase(err => done(err));
  });

  function getObjectFromModel(document) {
    return JSON.parse(JSON.stringify(document)); // Because model object use original type like Bson, Date
  }

  it('should respond 401 if not logged in', function(done) {
    helpers.api.requireLogin(app, 'get', '/ticketing/api/contracts/abc', done);
  });

  it('should respond 403 if user is not an administrator', function(done) {
    helpers.api.loginAsUser(app, user2.emails[0], password, helpers.callbacks.noErrorAnd(requestAsMember => {
      const req = requestAsMember(request(app).get('/ticketing/api/contracts/abc'));

      req.expect(403)
        .end(helpers.callbacks.noErrorAnd(res => {
          expect(res.body).to.deep.equal({
            error: { code: 403, message: 'Forbidden', details: 'User is not the administrator' }
          });
          done();
        }));
    }));
  });

  it('should respond 200 with contract object contains populated organization and software template', function(done) {
    helpers.api.loginAsUser(app, user1.emails[0], password, helpers.callbacks.noErrorAnd(requestAsMember => {
      const req = requestAsMember(request(app).get(`/ticketing/api/contracts/${contract._id}`));

      contract = getObjectFromModel(contract);
      organization = getObjectFromModel(organization);
      software = getObjectFromModel(software);

      req.expect(200)
        .end(helpers.callbacks.noErrorAnd(res => {
          expect(res.body).to.shallowDeepEqual({
            _id: contract._id.toString(),
            title: contract.title,
            startDate: contract.startDate,
            endDate: contract.endDate,
            organization: {
              _id: organization._id,
              shortName: organization.shortName
            },
            software: [{
              template: {
                _id: software._id,
                active: software.active,
                name: software.name,
                category: software.category,
                versions: software.versions
              },
              versions: software.versions,
              type: 'Non blocking'
            }]
          });
          done();
        }));
    }));
  });
});

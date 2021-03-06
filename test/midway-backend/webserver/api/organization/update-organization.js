'use strict';

const request = require('supertest');
const path = require('path');
const expect = require('chai').expect;
const mongoose = require('mongoose');

describe('PUT /ticketing/api/organizations/:id', function() {
  let app, lib, helpers, ObjectId;
  let user1, user2, organization;
  const password = 'secret';

  beforeEach(function(done) {
    helpers = this.helpers;
    ObjectId = mongoose.Types.ObjectId;
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
    .then(() => {
      lib.ticketingUserRole.create({
        user: user2._id,
        role: 'user'
      });
    })
    .then(() => {
      lib.organization.create({
        shortName: 'organization'
      })
      .then(createdOrganization => {
        organization = createdOrganization;
        done();
      });
    })
    .catch(err => done(err));
  });

  afterEach(function(done) {
    helpers.mongo.dropDatabase(err => done(err));
  });

  it('should respond 400 if organization payload is invalid', function(done) {
    helpers.api.loginAsUser(app, user1.emails[0], password, helpers.callbacks.noErrorAnd(requestAsMember => {
      const req = requestAsMember(request(app).put(`/ticketing/api/organizations/${organization._id}`));
      const newOrganization = {
        foo: 'baz'
      };

      req.send(newOrganization);
      req.expect(400)
        .end(helpers.callbacks.noErrorAnd(res => {
          expect(res.body).to.deep.equal({
            error: { code: 400, message: 'Bad Request', details: 'shortName is required' }
          });
          done();
        }));
    }));
  });

  it('should respond 400 if manager is invalid', function(done) {
    helpers.api.loginAsUser(app, user1.emails[0], password, helpers.callbacks.noErrorAnd(requestAsMember => {
      const req = requestAsMember(request(app).put(`/ticketing/api/organizations/${organization._id}`));
      const newOrganization = {
        shortName: 'baz',
        manager: 'wrong_objectId'
      };

      req.send(newOrganization);
      req.expect(400)
        .end(helpers.callbacks.noErrorAnd(res => {
          expect(res.body).to.deep.equal({
            error: { code: 400, message: 'Bad Request', details: 'manager is invalid' }
          });
          done();
        }));
    }));
  });

  it('should respond 400 if shortName is taken', function(done) {
    helpers.api.loginAsUser(app, user1.emails[0], password, helpers.callbacks.noErrorAnd(requestAsMember => {
      const req = requestAsMember(request(app).put(`/ticketing/api/organizations/${organization._id}`));

      lib.organization.create({
        shortName: 'organization2'
      })
      .then(createdOrganization => {
        const newOrganization = {
          shortName: createdOrganization.shortName
        };

        req.send(newOrganization);
        req.expect(400)
          .end(helpers.callbacks.noErrorAnd(res => {
            expect(res.body).to.deep.equal({
              error: { code: 400, message: 'Bad Request', details: 'shortName is taken' }
            });
            done();
          }));
      });
    }));
  });

  it('should respond 401 if not logged in', function(done) {
    helpers.api.requireLogin(app, 'put', '/ticketing/api/organizations/abc', done);
  });

  it('should respond 403 if user is not an administrator', function(done) {
    helpers.api.loginAsUser(app, user2.emails[0], password, helpers.callbacks.noErrorAnd(requestAsMember => {
      const req = requestAsMember(request(app).put('/ticketing/api/organizations/abc'));

      req.expect(403)
        .end(helpers.callbacks.noErrorAnd(res => {
          expect(res.body).to.deep.equal({
            error: { code: 403, message: 'Forbidden', details: 'User is not the administrator' }
          });
          done();
        }));
    }));
  });

  it('should respond 404 if organization id is not an ObjectId', function(done) {
    helpers.api.loginAsUser(app, user1.emails[0], password, helpers.callbacks.noErrorAnd(requestAsMember => {
      const req = requestAsMember(request(app).put('/ticketing/api/organizations/abc'));
      const newOrganization = {
        shortName: 'new'
      };

      req.send(newOrganization);
      req.expect(404)
        .end(helpers.callbacks.noErrorAnd(res => {
          expect(res.body).to.deep.equal({
            error: { code: 404, message: 'Not Found', details: 'Organization not found' }
          });
          done();
        }));
    }));
  });

  it('should respond 404 if organization not found', function(done) {
    helpers.api.loginAsUser(app, user1.emails[0], password, helpers.callbacks.noErrorAnd(requestAsMember => {
      const req = requestAsMember(request(app).put(`/ticketing/api/organizations/${new ObjectId()}`));
      const newOrganization = {
        shortName: 'new'
      };

      req.send(newOrganization);
      req.expect(404)
        .end(helpers.callbacks.noErrorAnd(res => {
          expect(res.body).to.deep.equal({
            error: { code: 404, message: 'Not Found', details: 'Organization not found' }
          });
          done();
        }));
    }));
  });

  it('should respond 204 if user is an administrator', function(done) {
      helpers.api.loginAsUser(app, user1.emails[0], password, helpers.callbacks.noErrorAnd(requestAsMember => {
        const newOrganization = {
          shortName: 'new'
        };
        const req = requestAsMember(request(app).put(`/ticketing/api/organizations/${organization._id}`));

        req.send(newOrganization);
        req.expect(204)
          .end(helpers.callbacks.noErrorAnd(() => {
            lib.organization.getById(organization._id)
              .then(result => {
                expect(result.shortName).to.equal(newOrganization.shortName);
                done();
              }, err => done(err || 'should resolve'));
          }));
      }));
    });
});

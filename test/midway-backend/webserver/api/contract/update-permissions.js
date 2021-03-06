'use strict';

const request = require('supertest');
const path = require('path');
const expect = require('chai').expect;
const mongoose = require('mongoose');

describe('POST /ticketing/api/contracts/:id/permissions', function() {
  let app, lib, helpers, ObjectId, esIntervalIndex;
  let user1, user2, contract, software, organization, entity;
  const password = 'secret';

  beforeEach(function(done) {
    helpers = this.helpers;
    ObjectId = mongoose.Types.ObjectId;
    esIntervalIndex = this.testEnv.serversConfig.elasticsearch.interval_index;
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
      lib.software.create({
        name: 'software',
        category: 'category',
        versions: ['1']
      })
      .then(createdSofware => (software = createdSofware)))
    .then(() =>
      lib.organization.create({
        shortName: 'organization'
      })
      .then(createOrganization => (organization = createOrganization)))
    .then(() =>
      lib.organization.create({
        shortName: 'entity',
        parent: organization._id
      })
      .then(createdEntity => (entity = createdEntity)))
    .then(() =>
      lib.contract.create({
        title: 'contract',
        organization: organization._id,
        startDate: new Date(),
        endDate: new Date(),
        software: [{
          template: software._id,
          type: 'normal',
          versions: software.versions
        }]
      })
      .then(createdContract => (contract = createdContract)))
    .then(() => done())
    .catch(err => done(err));
  });

  afterEach(function(done) {
    helpers.mongo.dropDatabase(err => done(err));
  });

  it('should respond 400 if there is invalid permission in the payload', function(done) {
    helpers.api.loginAsUser(app, user1.emails[0], password, helpers.callbacks.noErrorAnd(requestAsMember => {
      const req = requestAsMember(request(app).post(`/ticketing/api/contracts/${contract._id}/permissions`));
      const updatePermissions = {
        permissions: ['invalidEntityId', 2]
      };

      req.send(updatePermissions);
      req.expect(400)
        .end(helpers.callbacks.noErrorAnd(res => {
          expect(res.body).to.deep.equal({
            error: { code: 400, message: 'Bad Request', details: 'permissions is invalid' }
          });
          done();
        }));
    }));
  });

  it('should respond 400 if there is a permission which not belongs to contract\'s organization', function(done) {
    helpers.api.loginAsUser(app, user1.emails[0], password, helpers.callbacks.noErrorAnd(requestAsMember => {
      const req = requestAsMember(request(app).post(`/ticketing/api/contracts/${contract._id}/permissions`));
      const updatePermissions = {
        permissions: [new ObjectId()]
      };

      req.send(updatePermissions);
      req.expect(400)
        .end(helpers.callbacks.noErrorAnd(res => {
          expect(res.body).to.deep.equal({
            error: { code: 400, message: 'Bad Request', details: 'entities does not belong to contract\'s organization' }
          });
          done();
        }));
    }));
  });

  it('should respond 401 if not logged in', function(done) {
    helpers.api.requireLogin(app, 'post', `/ticketing/api/contracts/${contract._id}/permissions`, done);
  });

  it('should respond 403 if user is not an administrator', function(done) {
    helpers.api.loginAsUser(app, user2.emails[0], password, helpers.callbacks.noErrorAnd(requestAsMember => {
      const req = requestAsMember(request(app).post(`/ticketing/api/contracts/${contract._id}/permissions`));

      req.expect(403)
        .end(helpers.callbacks.noErrorAnd(res => {
          expect(res.body).to.deep.equal({
            error: { code: 403, message: 'Forbidden', details: 'User is not the administrator' }
          });
          done();
        }));
    }));
  });

  it('should respond 404 if contract id is not an ObjectId', function(done) {
    helpers.api.loginAsUser(app, user1.emails[0], password, helpers.callbacks.noErrorAnd(requestAsMember => {
      const req = requestAsMember(request(app).post('/ticketing/api/contracts/abc/permissions'));
      const updatePermissions = {
        permissions: [new ObjectId()]
      };

      req.send(updatePermissions);
      req.expect(404)
        .end(helpers.callbacks.noErrorAnd(res => {
          expect(res.body).to.deep.equal({
            error: { code: 404, message: 'Not Found', details: 'Contract not found' }
          });
          done();
        }));
    }));
  });

  it('should respond 404 if contract is not found', function(done) {
    helpers.api.loginAsUser(app, user1.emails[0], password, helpers.callbacks.noErrorAnd(requestAsMember => {
      const req = requestAsMember(request(app).post(`/ticketing/api/contracts/${new ObjectId()}/permissions`));
      const updatePermissions = {
        permissions: [new ObjectId()]
      };

      req.send(updatePermissions);
      req.expect(404)
        .end(helpers.callbacks.noErrorAnd(res => {
          expect(res.body).to.deep.equal({
            error: { code: 404, message: 'Not Found', details: 'Contract not found' }
          });
          done();
        }));
    }));
  });

  it('should respond 204 if permissions = 1 (all entities have permission)', function(done) {
    helpers.api.loginAsUser(app, user1.emails[0], password, helpers.callbacks.noErrorAnd(requestAsMember => {
      const req = requestAsMember(request(app).post(`/ticketing/api/contracts/${contract._id}/permissions`));
      const updatePermissions = {
        permissions: 1
      };

      req.send(updatePermissions);
      req.expect(204)
        .end(helpers.callbacks.noErrorAnd(() => {
          lib.contract.getById(contract._id)
            .then(result => {
              expect(result.permissions).to.equal(updatePermissions.permissions);

              setTimeout(function() {
                lib.contract.search({
                  search: contract.title
                }).then(result => {
                  expect(result.list[0].software[0].template).to.deep.equal({
                    _id: software._id.toString(),
                    name: software.name
                  });
                  done();
                });
              }, esIntervalIndex);
            }, err => done(err || 'should resolve'));
        }));
    }));
  });

  it('should respond 204 if permissions is blank array (no entity has permission)', function(done) {
    helpers.api.loginAsUser(app, user1.emails[0], password, helpers.callbacks.noErrorAnd(requestAsMember => {
      const req = requestAsMember(request(app).post(`/ticketing/api/contracts/${contract._id}/permissions`));
      const updatePermissions = {
        permissions: []
      };

      req.send(updatePermissions);
      req.expect(204)
        .end(helpers.callbacks.noErrorAnd(() => {
          lib.contract.getById(contract._id)
            .then(result => {
              expect(result.permissions.length).to.equal(0);

              setTimeout(function() {
                lib.contract.search({
                  search: contract.title
                }).then(result => {
                  expect(result.list[0].software[0].template).to.deep.equal({
                    _id: software._id.toString(),
                    name: software.name
                  });
                  done();
                });
              }, esIntervalIndex);
            }, err => done(err || 'should resolve'));
        }));
    }));
  });

  it('should respond 204 if permissions is array of entities of contract\'s organization', function(done) {
    helpers.api.loginAsUser(app, user1.emails[0], password, helpers.callbacks.noErrorAnd(requestAsMember => {
      const req = requestAsMember(request(app).post(`/ticketing/api/contracts/${contract._id}/permissions`));
      const updatePermissions = {
        permissions: [String(entity._id)]
      };

      req.send(updatePermissions);
      req.expect(204)
        .end(helpers.callbacks.noErrorAnd(() => {
          lib.contract.getById(contract._id)
            .then(result => {
              expect(result.permissions).to.shallowDeepEqual(updatePermissions.permissions);

              setTimeout(function() {
                lib.contract.search({
                  search: contract.title
                }).then(result => {
                  expect(result.list[0].software[0].template).to.deep.equal({
                    _id: software._id.toString(),
                    name: software.name
                  });
                  expect(result.list[0].organization).to.deep.equal({
                    _id: organization._id.toString(),
                    shortName: organization.shortName
                  });
                  done();
                });
              }, esIntervalIndex);
            }, err => done(err || 'should resolve'));
        }));
    }));
  });
});

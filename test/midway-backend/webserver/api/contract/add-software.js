'use strict';

const request = require('supertest');
const path = require('path');
const expect = require('chai').expect;
const mongoose = require('mongoose');

describe('The POST /ticketing/api/contracts/:id/software', function() {
  let app, lib, helpers, ObjectId, esIntervalIndex, apiURL;
  let user1, user2, software1, software2, software3, demand1, demand2, contract, organization;
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
      lib.organization.create({
        shortName: 'organization'
      })
      .then(createOrganization => (organization = createOrganization)))
    .then(() => done())
    .catch(err => done(err));
  });

  beforeEach(function(done) {
    const software1Json = {
      name: 'software1',
      category: 'category1',
      versions: ['1', '2']
    };

    const software2Json = {
      name: 'software2',
      category: 'category2',
      versions: ['3', '4']
    };

    const software3Json = {
      active: false,
      name: 'software3',
      category: 'category3',
      versions: ['5', '6']
    };

    lib.software.create(software1Json)
      .then(createdSoftware1 => {
        software1 = createdSoftware1;

        return lib.software.create(software2Json)
          .then(createdSoftware2 => {
            software2 = createdSoftware2;

            return lib.software.create(software3Json)
              .then(createdSoftware3 => {
                software3 = createdSoftware3;
                done();
              });
          });
      })
      .catch(err => done(err));
  });

  beforeEach(function(done) {
    demand1 = {
      demandType: 'demandType1',
      softwareType: 'softwareType1',
      issueType: 'issueType1'
    };

    demand2 = {
      demandType: 'demandType2',
      softwareType: 'softwareType2',
      issueType: 'issueType2'
    };

    lib.contract.create({
      title: 'contract1',
      organization: organization._id,
      startDate: new Date(),
      endDate: new Date(),
      demands: [
        demand1,
        demand2
      ],
      software: [{
        template: software1._id,
        type: demand1.softwareType,
        versions: software1.versions
      }]
    })
    .then(createdContract => {
      contract = createdContract;
      apiURL = `/ticketing/api/contracts/${contract._id}/software`;
      done();
    })
    .catch(err => done(err));
  });

  afterEach(function(done) {
    helpers.mongo.dropDatabase(err => done(err));
  });

  it('should respond 401 if not logged in', function(done) {
    helpers.api.requireLogin(app, 'post', apiURL, done);
  });

  it('should respond 403 if user is not an administrator', function(done) {
    helpers.api.loginAsUser(app, user2.emails[0], password, helpers.callbacks.noErrorAnd(requestAsMember => {
      const req = requestAsMember(request(app).post(apiURL));

      req.expect(403)
        .end(helpers.callbacks.noErrorAnd(res => {
          expect(res.body).to.deep.equal({
            error: { code: 403, message: 'Forbidden', details: 'User is not the administrator' }
          });
          done();
        }));
    }));
  });

  it('should respond 400 if template is invalid', function(done) {
    helpers.api.loginAsUser(app, user1.emails[0], password, helpers.callbacks.noErrorAnd(requestAsMember => {
      const req = requestAsMember(request(app).post(apiURL));

      req.send({
        template: 'wrong ObjectId()',
        type: demand1.softwareType,
        versions: software1.versions
      });
      req.expect(400)
        .end(helpers.callbacks.noErrorAnd(res => {
          expect(res.body).to.deep.equal({
            error: { code: 400, message: 'Bad Request', details: 'Software not found' }
          });
          done();
        }));
    }));
  });

  it('should respond 400 if software not found', function(done) {
    helpers.api.loginAsUser(app, user1.emails[0], password, helpers.callbacks.noErrorAnd(requestAsMember => {
      const req = requestAsMember(request(app).post(apiURL));

      req.send({
        template: new ObjectId(),
        type: demand1.softwareType,
        versions: software1.versions
      });
      req.expect(400)
        .end(helpers.callbacks.noErrorAnd(res => {
          expect(res.body).to.deep.equal({
            error: { code: 400, message: 'Bad Request', details: 'Software is not available' }
          });
          done();
        }));
    }));
  });

  it('should respond 400 if software is not active', function(done) {
    helpers.api.loginAsUser(app, user1.emails[0], password, helpers.callbacks.noErrorAnd(requestAsMember => {
      const req = requestAsMember(request(app).post(apiURL));

      req.send({
        template: software3._id,
        type: demand1.softwareType,
        versions: software1.versions
      });
      req.expect(400)
        .end(helpers.callbacks.noErrorAnd(res => {
          expect(res.body).to.deep.equal({
            error: { code: 400, message: 'Bad Request', details: 'Software is not available' }
          });
          done();
        }));
    }));
  });

  it('should respond 400 if there is a duplicated software', function(done) {
    helpers.api.loginAsUser(app, user1.emails[0], password, helpers.callbacks.noErrorAnd(requestAsMember => {
      const req = requestAsMember(request(app).post(apiURL));

      req.send({
        template: software1._id,
        type: demand1.softwareType,
        versions: software1.versions
      });
      req.expect(400)
        .end(helpers.callbacks.noErrorAnd(res => {
          expect(res.body).to.deep.equal({
            error: { code: 400, message: 'Bad Request', details: 'Software already exists' }
          });
          done();
        }));
    }));
  });

  it('should respond 400 if there is no type is provided', function(done) {
    helpers.api.loginAsUser(app, user1.emails[0], password, helpers.callbacks.noErrorAnd(requestAsMember => {
      const req = requestAsMember(request(app).post(apiURL));

      req.send({
        template: software2._id,
        versions: software2.versions
      });
      req.expect(400)
        .end(helpers.callbacks.noErrorAnd(res => {
          expect(res.body).to.deep.equal({
            error: { code: 400, message: 'Bad Request', details: 'Software type is required' }
          });
          done();
        }));
    }));
  });

  it('should respond 400 if there is unsupported type', function(done) {
    helpers.api.loginAsUser(app, user1.emails[0], password, helpers.callbacks.noErrorAnd(requestAsMember => {
      const req = requestAsMember(request(app).post(apiURL));

      req.send({
        template: software2._id,
        type: 'unsupported type',
        versions: software2.versions
      });
      req.expect(400)
        .end(helpers.callbacks.noErrorAnd(res => {
          expect(res.body).to.deep.equal({
            error: { code: 400, message: 'Bad Request', details: 'Software type is unsupported' }
          });
          done();
        }));
    }));
  });

  it('should respond 400 if there is no versions is provided', function(done) {
    helpers.api.loginAsUser(app, user1.emails[0], password, helpers.callbacks.noErrorAnd(requestAsMember => {
      const req = requestAsMember(request(app).post(apiURL));

      req.send({
        template: software2._id,
        type: demand1.softwareType
      });
      req.expect(400)
        .end(helpers.callbacks.noErrorAnd(res => {
          expect(res.body).to.deep.equal({
            error: { code: 400, message: 'Bad Request', details: 'Software versions is required' }
          });
          done();
        }));
    }));
  });

  it('should respond 400 if there is unsupported versions', function(done) {
    helpers.api.loginAsUser(app, user1.emails[0], password, helpers.callbacks.noErrorAnd(requestAsMember => {
      const req = requestAsMember(request(app).post(apiURL));

      req.send({
        template: software2._id,
        type: demand1.softwareType,
        versions: ['9', '10']
      });
      req.expect(400)
        .end(helpers.callbacks.noErrorAnd(res => {
          expect(res.body).to.deep.equal({
            error: { code: 400, message: 'Bad Request', details: 'Software versions are unsupported' }
          });
          done();
        }));
    }));
  });

  it('should respond 204 if success to add software for contract', function(done) {
    helpers.api.loginAsUser(app, user1.emails[0], password, helpers.callbacks.noErrorAnd(requestAsMember => {
      const req = requestAsMember(request(app).post(apiURL));

      req.send({
        template: software2._id,
        type: demand1.softwareType,
        versions: [software2.versions[0]]
      });
      req.expect(204)
        .end(helpers.callbacks.noErrorAnd(() => {
          lib.contract.getById(contract._id)
            .then(updatedContract => {
              expect(updatedContract.software.length).to.equal(2);
              expect(updatedContract.software[1].template.toString()).to.equal(software2._id.toString());

              setTimeout(function() {
                lib.contract.search({
                  search: contract.title
                }).then(result => {
                  expect(result.list[0].software[0].template).to.deep.equal({
                    _id: software1._id.toString(),
                    name: software1.name
                  });
                  expect(result.list[0].software[1].template).to.deep.equal({
                    _id: software2._id.toString(),
                    name: software2.name
                  });
                  expect(result.list[0].organization).to.deep.equal({
                    _id: organization._id.toString(),
                    shortName: organization.shortName
                  });
                  done();
                });
              }, esIntervalIndex);
            });
        }));
    }));
  });
});

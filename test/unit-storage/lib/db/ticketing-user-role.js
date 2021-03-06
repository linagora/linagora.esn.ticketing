'use strict';

const chai = require('chai');
const expect = chai.expect;

describe('The TicketingUserRole model', function() {
  let TicketingUserRole, ObjectId, mongoose;

  beforeEach(function(done) {
    mongoose = this.moduleHelpers.dependencies('db').mongo.mongoose;
    ObjectId = mongoose.Types.ObjectId;

    require(this.testEnv.backendPath + '/lib/db/ticketing-user-role')(this.moduleHelpers.dependencies);
    TicketingUserRole = mongoose.model('TicketingUserRole');

    this.connectMongoose(mongoose, done);
  });

  afterEach(function(done) {
    delete mongoose.connection.models.TicketingUserRole;
    this.helpers.mongo.dropDatabase(err => {
      if (err) return done(err);
      this.testEnv.core.db.mongo.mongoose.connection.close(done);
    });
  });

  function saveTicketingUserRole(userRoleJson, callback) {
    const userRole = new TicketingUserRole(userRoleJson);

    return userRole.save(callback);
  }

  describe('The role field', function() {
    it('should not save TicketingUserRole if role is invalid', function(done) {
      const userRoleJson = {
        user: new ObjectId(),
        role: 'invalid-role'
      };

      saveTicketingUserRole(userRoleJson, err => {
        expect(err).to.exist;
        expect(err.errors.role.message).to.equal('Invalid TicketingUser role');
        done();
      });
    });

    it('should save TicketingUserRole if all fields are valid', function(done) {
      const userRoleJson = {
        user: new ObjectId(),
        role: 'user'
      };

      saveTicketingUserRole(userRoleJson, (err, savedUserRole) => {
        expect(err).to.not.exist;
        expect(savedUserRole.role).to.equal(userRoleJson.role);
        done();
      });
    });
  });
});

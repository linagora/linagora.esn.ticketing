'use stric';

/* global chai: false */

var expect = chai.expect;

describe('The TicketingTicketFormDemandController', function() {
  var $rootScope, $controller;
  var contract;

  beforeEach(function() {
    module('linagora.esn.ticketing');

    inject(function(
      _$rootScope_,
      _$controller_
    ) {
      $rootScope = _$rootScope_;
      $controller = _$controller_;
    });

    contract = {
      demands: [{
        demandType: 'demandType1',
        softwareType: 'softwareType1',
        issueType: 'issueType1'
      }, {
        demandType: 'demandType2',
        softwareType: 'softwareType2',
        issueType: 'issueType2'
      }],
      software: [{
        template: {
          _id: 'softwareId',
          name: 'software'
        },
        versions: ['1', '2', '3'],
        type: 'softwareType2'
      }]
    };
  });

  function buildSofwareLabel(software) {
    return software.template.name + ' - (' + software.type + ')';
  }

  function initController() {
    var $scope = $rootScope.$new();

    var controller = $controller('TicketingTicketFormDemandController', { $scope: $scope });

    controller.$onInit();
    $scope.$digest();

    return controller;
  }

  describe('The onDemandTypeChange function', function() {
    it('should set availableSeverities and availableSoftware arrays to empty if there is no ticket\'s demandType', function() {
      var controller = initController();

      controller.ticket = {
        contract: contract
      };
      controller.onDemandTypeChange();

      expect(controller.availableSeverities.length).to.equal(0);
      expect(controller.availableSoftware.length).to.equal(0);
      expect(controller.ticket).to.deep.equal({
        contract: contract
      });
      expect(controller.software).to.be.null;
      expect(controller.severity).to.be.null;
    });

    it('should build availableSeverities array without \'No severity\' item when given demandType does not support no severity case', function() {
      var controller = initController();

      controller.ticket = {
        contract: contract,
        demandType: contract.demands[0].demandType
      };
      controller.onDemandTypeChange();

      expect(controller.availableSeverities).to.deep.equal([contract.demands[0].issueType]);
      expect(controller.availableSeverities).to.not.have.members(['No severity']);
      expect(controller.ticket).to.deep.equal({
        contract: contract,
        demandType: contract.demands[0].demandType
      });
      expect(controller.software).to.be.null;
      expect(controller.severity).to.be.null;
    });

    it('should build availableSeverities array with \'No severity\' item at the top when given demandType supports no severity case', function() {
      var controller = initController();

      contract.demands.push({
        demandType: contract.demands[0].demandType
      });
      controller.ticket = {
        contract: contract,
        demandType: contract.demands[0].demandType
      };
      controller.onDemandTypeChange();

      expect(controller.availableSeverities).to.deep.equal(['No severity', contract.demands[0].issueType]);
      expect(controller.ticket).to.deep.equal({
        contract: contract,
        demandType: contract.demands[0].demandType
      });
      expect(controller.software).to.be.null;
      expect(controller.severity).to.be.null;
    });

    it('should set availableSoftware to empty array when given demandType does not support no software and no severity case', function() {
      var controller = initController();

      controller.ticket = {
        contract: contract,
        demandType: contract.demands[0].demandType
      };
      controller.onDemandTypeChange();

      expect(controller.availableSoftware).to.deep.equal([]);
      expect(controller.ticket).to.deep.equal({
        contract: contract,
        demandType: contract.demands[0].demandType
      });
      expect(controller.software).to.be.null;
      expect(controller.severity).to.be.null;
    });

    it('should build availableSoftware array with \'No software\' item at the top when given demandType supports no software but not no severity case', function() {
      var controller = initController();

      contract.demands.push({
        demandType: contract.demands[0].demandType
      });

      controller.ticket = {
        contract: contract,
        demandType: contract.demands[0].demandType
      };
      controller.onDemandTypeChange();

      expect(controller.availableSoftware[0].label).to.deep.equal('No software');
      expect(controller.ticket).to.deep.equal({
        contract: contract,
        demandType: contract.demands[0].demandType
      });
      expect(controller.software).to.be.null;
      expect(controller.severity).to.be.null;
    });
  });

  describe('The onServerityChange function', function() {
    it('should set availableSoftware array if there is no ticket\'s severity', function() {
      var controller = initController();

      contract.demands.push({
        demandType: contract.demands[0].demandType,
        softwareType: contract.software[0].type
      });
      controller.ticket = {
        contract: contract,
        demandType: contract.demands[2].demandType
      };
      controller.severity = 'No severity';
      controller.onServerityChange();

      expect(controller.availableSoftware.length).to.equal(1);
      expect(controller.availableSoftware[0].label).to.equal(buildSofwareLabel(contract.software[0]));
      expect(controller.software).to.be.null;
    });

    it('should build availableSoftware when ticket\'s severity is provided', function() {
      var controller = initController();

      controller.ticket = {
        contract: contract,
        demandType: contract.demands[1].demandType
      };
      controller.severity = contract.demands[1].issueType;
      controller.onServerityChange();

      expect(controller.availableSoftware).to.deep.equal([{
        type: contract.demands[1].softwareType,
        template: contract.software[0].template._id,
        versions: contract.software[0].versions,
        label: buildSofwareLabel(contract.software[0])
      }]);

      expect(controller.ticket).to.deep.equal({
        contract: contract,
        demandType: contract.demands[1].demandType,
        severity: contract.demands[1].issueType
      });
      expect(controller.software).to.be.null;
    });

    it('should build availableSoftware array with \'No software\' item at the top when pair given demandType and severity supports no software ', function() {
      var controller = initController();

      contract.demands.push({
        demandType: contract.demands[0].demandType,
        issueType: contract.demands[0].issueType
      });

      controller.ticket = {
        contract: contract,
        demandType: contract.demands[0].demandType
      };
      controller.severity = contract.demands[0].issueType;
      controller.onServerityChange();

      expect(controller.availableSoftware[0].label).to.deep.equal('No software');
      expect(controller.ticket).to.deep.equal({
        contract: contract,
        demandType: contract.demands[0].demandType,
        severity: contract.demands[0].issueType
      });
      expect(controller.software).to.be.null;
    });
  });

  describe('The onSoftwareChange function', function() {
    it('should build availableSoftwareVersions when software change', function() {
      var controller = initController();

      controller.ticket = {
        contract: contract,
        demandType: contract.demands[1].demandType,
        severity: contract.demands[1].issueType
      };

      var availableSoftware = [{
        type: contract.demands[1].softwareType,
        template: contract.software[0].template._id,
        versions: contract.software[0].versions,
        label: buildSofwareLabel(contract.software[0])
      }];

      controller.software = availableSoftware[0];
      controller.onSoftwareChange();

      expect(controller.availableSoftwareVersions).to.deep.equal(contract.software[0].versions);
      expect(controller.ticket).to.deep.equal({
        contract: contract,
        demandType: contract.demands[1].demandType,
        severity: contract.demands[1].issueType,
        software: {
          template: contract.software[0].template._id,
          criticality: contract.software[0].type
        }
      });
    });
  });
});

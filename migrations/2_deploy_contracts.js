var TheProjectMock = artifacts.require("./TheProjectMock.sol");

module.exports = function(deployer) {
  deployer.deploy(TheProjectMock);
};

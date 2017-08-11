var BettingonTestDeploy = artifacts.require("./BettingonTestDeploy.sol");

module.exports = function(deployer) {

  deployer.deploy(
  	 BettingonTestDeploy,
     "0x586643C7D083a83E4b0FCAAE87945D31A21B5E7e" // Oraclize Bridge
  );

};

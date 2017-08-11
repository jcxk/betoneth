var BettingonUITestDeploy = artifacts.require("./BettingonUITestDeploy.sol");

module.exports = function(deployer) {

  deployer.deploy(
  	 BettingonUITestDeploy,
     "0x6f485c8bf6fc43ea212e93bbf8ce046c7f1cb475" // Oraclize Bridge
  );

};

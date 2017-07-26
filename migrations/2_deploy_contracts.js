var BettingonTest = artifacts.require("./BettingonTest.sol");

module.exports = function(deployer) {

  deployer.deploy(BettingonTest)

  deployer.deploy(
  	 BettingonTest,
  	 60,   // betCycleLength
     0,    // betCycleOffset
     10,   // betMinReveaLength
     60,   // betMaxReveaLength
     web3.toBigNumber("10000000000000000"), // _betAmount
     1,   // platformFee
  	 "0xdead", // platformFeeAddress
  	 3    // boatFee
  );

};

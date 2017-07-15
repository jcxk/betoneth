var BettingonTest = artifacts.require("./BettingonTest.sol");
var BettingonDeploy = artifacts.require("./BettingonDeploy.sol");

module.exports = function(deployer) {

  deployer.deploy(BettingonDeploy)


/*
  deployer.deploy(OraclizePriceUpdater)
  .then( function(_oraclizePriceUpdater) {
    console.log(_oraclizePriceUpdater);
    deployer.deploy(
       BettingonTest,
       _oraclizePriceUpdater,
       0,  // directory
       3600, // betCycleLength
       0,  // betCycleOffset
       3600, // betMinReveaLength
       7200, // betMaxReveaLength
       web3.toWei('5', 'finney'),
       1, // platformFee
       "0x73b6dF82f5ba97033597Ba276F42999770867fDD", // platformFeeAddress
       3  // boatFee
    );
  });
*/
/*
  deployer.deploy(
  	 BettingonTest,
  	 60, // betCycleLength
     0,    // betCycleOffset
     10, // betMinReveaLength
     60, // betMaxReveaLength
     web3.toBigNumber("10000000000000000"),
     1, // platformFee
  	 "0xdead", // platformFeeAddress
  	 3  // boatFee
  );
  */
};

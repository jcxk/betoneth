var BettingonMock = artifacts.require("./BettingonMock.sol");

module.exports = function(deployer) {
  deployer.deploy(
  	 BettingonMock,
  	 60, // betCycleLength
     0,    // betCycleOffset
     10, // betMinReveaLength
     60, // betMaxReveaLength
     1, // betAmountInDollars
     1, // platformFee
  	 "0xdead", // platformFeeAddress
  	 3  // boatFee
  );
};

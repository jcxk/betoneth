var BettingonMock = artifacts.require("./BettingonMock.sol");

module.exports = function(deployer) {
  deployer.deploy(
  	 BettingonMock,
  	 120, // betCycleLength
     0,    // betCycleOffset
     120, // betMinReveaLength
     240, // betMaxReveaLength
     1, // betAmountInDollars
     1, // platformFee
  	 "0xdead", // platformFeeAddress
  	 3  // boatFee
  );
};

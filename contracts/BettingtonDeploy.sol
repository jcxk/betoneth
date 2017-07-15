pragma solidity ^0.4.11;

import "./BettingonImpl.sol";

contract BettingonDeploy is BettingonImpl {
    
   function BettingonDeploy(
    ) BettingonImpl(
        /* priceUpdaterAddress */ 0xE15E57fE0D93E2F898d80A1AFa6a33da682358e9,
        /* directory           */ 0, 
        /* betCycleLength      */ 3600*4,
        /* betCycleOffset      */ 0,
        /* betMinReveaLength   */ 3600*4,
        /* betMaxReveaLength   */ 3600*8,
        /* betAmount           */ 10**16,  // 0.01 eths
        /* platformFee         */ 1, 
        /* platformFeeAddress  */ 0,
        /* boatFee             */ 3
    ) {
        platformFeeAddress = msg.sender;
    }

    function __updateEthPrice(uint _milliDollarsPerEth) {
        updateEthPrice(_milliDollarsPerEth);
    }

}
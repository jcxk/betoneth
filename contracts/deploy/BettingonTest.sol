pragma solidity ^0.4.11;

import "../BettingonImpl.sol";
import "../PriceUpdaterImpl.sol";

contract BettingonTest is BettingonImpl {
    
   function BettingonTest(
        address owner,
        address priceUpdaterAddress
    ) BettingonImpl(
        owner,
        priceUpdaterAddress,
        /* directory           */ 0, 
        /* betCycleLength      */ 60*4,
        /* betCycleOffset      */ 0,
        /* betMinReveaLength   */ 60,
        /* betMaxReveaLength   */ 60*3,
        /* betAmount           */ 10**16,  // 0.01 eths
        /* platformFee         */ 1, 
        /* platformFeeAddress  */ 0,
        /* boatFee             */ 3
    ) {
        platformFeeAddress = msg.sender;
    }

    function terminate() {
        assert(msg.sender == owner);
        selfdestruct(owner);
    }

}

contract BettingonTestDeploy {
    
    PriceUpdaterImpl public pu;
    BettingonTest    public bon;
    
    function BettingonTestDeploy(
        address oar
    ) payable {
        pu = new PriceUpdaterImpl(msg.sender);
        bon = new BettingonTest(msg.sender,address(pu));
        pu.initialize(
            oar,
            address(bon),
            "json(https://api.coinmarketcap.com/v1/ticker/ethereum/).0.price_usd"
        );
    }
    
}

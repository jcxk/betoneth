pragma solidity ^0.4.11;

import "../BettingonImpl.sol";
import "../PriceUpdaterImpl.sol";

contract Bettingon4h10finney is BettingonImpl {
    
   function Bettingon4h10finney(
        address owner,
        address priceUpdaterAddress
    ) BettingonImpl(
        owner,
        priceUpdaterAddress,
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

    function terminate() {
        assert(msg.sender == owner);
        selfdestruct(owner);
    }

}

contract Bettingon4h10finneyDeploy {
    
    PriceUpdaterImpl     public pu;
    Bettingon4h10finney  public bon;
    
    function Bettingon4h10finneyDeploy() payable {
        pu = new PriceUpdaterImpl(msg.sender);
        bon = new Bettingon4h10finney(msg.sender,address(pu));
        pu.initialize(
            0,
            address(bon),
            "json(https://api.coinmarketcap.com/v1/ticker/ethereum/).0.price_usd"
        );
        pu.transfer(msg.value);
    }
    
}
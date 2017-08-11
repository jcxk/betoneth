pragma solidity ^0.4.11;

import "../BettingonImpl.sol";

contract BettingonUnitTest is BettingonImpl, PriceUpdater {
    
   function BettingonUnitTest(
        uint    _betCycleLength,
        uint    _betCycleOffset,
        uint    _betMinReveaLength,
        uint    _betMaxReveaLength,
        uint    _betAmountInDollars,
        uint    _platformFee,
        address _platformFeeAddress,
        uint    _boatFee
    ) BettingonImpl (
        msg.sender,
        this,
        0,
        _betCycleLength,
        _betCycleOffset,
        _betMinReveaLength,
        _betMaxReveaLength,
        _betAmountInDollars,
        _platformFee,
        _platformFeeAddress,
        _boatFee
    ) {

    }
    function __updateEthPrice(uint _roundNo, uint _target) {
        setTargetValue(_roundNo,_target);
    }
    function schedule(uint _roundId, uint _offset) {
        
    }
}
pragma solidity ^0.4.11;

import "../BettingonImpl.sol";

contract BettingonUnitTest is BettingonImpl, PriceUpdater {
    
   function BettingonUnitTest(
        uint64  _betCycleLength,
        uint64  _betCycleOffset,
        uint64  _betMinReveaLength,
        uint64  _betMaxReveaLength,
        uint    _betAmount,
        uint8   _platformFee,
        address _platformFeeAddress,
        uint8   _boatFee
    ) BettingonImpl (
        msg.sender,
        this,
        0,
        _betCycleLength,
        _betCycleOffset,
        _betMinReveaLength,
        _betMaxReveaLength,
        _betAmount,
        _platformFee,
        _platformFeeAddress,
        _boatFee
    ) {

    }
    function __updateEthPrice(uint32 _roundNo, uint32 _target) {
        setTargetValue(_roundNo,_target);
    }
    function schedule(uint32 _roundId, uint64 _offset) {
        
    }
}
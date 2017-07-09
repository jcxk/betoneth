pragma solidity ^0.4.11;

import "./BettingonBase.sol";

contract BettingonMock is BettingonBase {
    
   function BettingonMock(
        uint    _betCycleLength,
        uint    _betCycleOffset,
        uint    _betMinReveaLength,
        uint    _betMaxReveaLength,
        uint    _betAmountInDollars,
        uint    _platformFee,
        address _platformFeeAddress,
        uint    _boatFee

    ) BettingonBase(
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

    function __updateEthPrice(uint _milliDollarsPerEth) {
        updateEthPrice(_milliDollarsPerEth);

    }

}

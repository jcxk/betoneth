pragma solidity ^0.4.11;

import "./TheProjectBase.sol";

contract TheProjectMock is TheProjectBase {
    
   function TheProjectMock(
        uint    _betCycleLength,
        uint    _betCycleOffset,
        uint    _betMinReveaLength,
        uint    _betMaxReveaLength,
        uint    _betAmountInDollars,
        uint    _platformFee,
        address _platformFeeAddress,
        uint    _boatFee

    ) TheProjectBase(
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

    function getNow() constant returns (uint) {
    	return now;
    }
}

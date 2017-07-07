pragma solidity ^0.4.11;

import "./TheProjectBase.sol";

contract TheProjectMock is TheProjectBase {
    
   function TheProjectMock(
        uint _betCycleLength,
        uint _betCycleOffset,
        uint _betMinReveaLength,
        uint _betMaxReveaLength,
        uint _betAmountInDollars
    
    ) TheProjectBase(
    	_betCycleLength,
        _betCycleOffset,
    	_betMinReveaLength,
    	_betMaxReveaLength,
    	_betAmountInDollars) {
    }

    function __updateEthPrice(uint _milliDollarsPerEth) {
        updateEthPrice(_milliDollarsPerEth);
    }

    function getNow() constant returns (uint) {
    	return now;
    }

}

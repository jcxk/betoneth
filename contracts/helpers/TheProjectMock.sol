pragma solidity ^0.4.11;

import "../TheProjectBase.sol";

contract TheProject is TheProjectBase {
    
    function __updateEthPrice(uint _milliDollarsPerEth) {
        updateEthPrice(_milliDollarsPerEth);
    }

}

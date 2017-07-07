pragma solidity ^0.4.11;

import "./BettingonBase.sol";
import "./OraclizeAPI04.sol";

contract BettingonOraclize is BettingonBase, usingOraclize {

   function BettingonOraclize(

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
    
        oraclize_setProof(proofType_TLSNotary | proofStorage_IPFS);
        queryOraclarize();
    }

    function __callback(bytes32 myid, string result, bytes proof) {
        if (msg.sender != oraclize_cbAddress()) throw;
        
        uint milliUsdPerEth = stringToUint(result); // TODO: extra checks
        
        if (milliUsdPerEth > 0 ) {
            updateEthPrice(milliUsdPerEth);
        }
        queryOraclarize();
    }
    
    function queryOraclarize() payable {
        if (oraclize.getPrice("URL") > this.balance) {
            LogError("Oraclize query was NOT sent, please add some ETH to cover for the query fee");
            return;
        }
        oraclize_query(60, "URL", "json(https://api.coinmarketcap.com/v1/ticker/ethereum/).0.price_usd");
    }
    
    function stringToUint(string s) internal constant returns (uint result) {
        bytes memory b = bytes(s);
        uint i;
        result = 0;
        for (i = 0; i < b.length; i++) {
            uint c = uint(b[i]);
            if (c >= 48 && c <= 57) {
                result = result * 10 + (c - 48);
            }
        }
    }    
}
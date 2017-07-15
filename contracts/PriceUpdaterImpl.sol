pragma solidity ^0.4.11;

import "./Bettingon.sol";
import "./PriceUpdater.sol";
import "./OraclizeAPI04.sol";

contract PriceUpdaterImpl is PriceUpdater, usingOraclize {
   
   event LogError(string error);
   event LogUpdate(uint value);

   address   public owner;
   Bettingon public bettingon; 
   string    public url;

    function PriceUpdaterImpl(address _owner) {
        owner = _owner;
    }

    function initialize(address _bettingon, string _url) {
        assert(tx.origin == owner);

        bettingon = Bettingon(_bettingon);
        url = _url;     // "json(https://api.coinmarketcap.com/v1/ticker/ethereum/).0.price_usd"

        oraclize_setCustomGasPrice(4 * (10 ** 9)); // Set price to 4 Gigawei
        oraclize_setProof(proofType_TLSNotary | proofStorage_IPFS);
    }

    function __callback(bytes32 myid, string result, bytes proof) {
        if (msg.sender != oraclize_cbAddress()) throw;
        
        uint milliUsdPerEth = stringToUint(result); // TODO: extra checks
        LogUpdate(milliUsdPerEth);
        if (milliUsdPerEth > 0 && address(bettingon)!=0) {
            bettingon.updateEthPrice(milliUsdPerEth);
        }
    }
    
    function schedule(uint offset) {
        if (oraclize.getPrice("URL") > this.balance) {
            LogError("Insuficient amount");
            return;
        }
        oraclize_query(offset, "URL", url);
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
    
    function () payable {
        
    }

    function terminate() {
        assert(msg.sender == owner);
        selfdestruct(owner);
    }
}

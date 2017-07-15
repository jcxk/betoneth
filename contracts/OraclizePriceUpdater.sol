pragma solidity ^0.4.11;

import "./Bettingon.sol";
import "./OraclizeAPI04.sol";

contract OraclizePriceUpdater is usingOraclize {
   
   event LogError(string error);
   event LogUpdate(uint value);

   address   public owner;
   Bettingon public bettingon; 
   string    public url;
   uint      public delay;

    function OraclizePriceUpdater() {
        owner = msg.sender;
    }

    function initialize(address _bettingon, string _url, uint _delay) {
        assert(msg.sender == owner);

        bettingon = Bettingon(_bettingon);
        url = _url;     // "json(https://api.coinmarketcap.com/v1/ticker/ethereum/).0.price_usd"
        delay = _delay; // 60

        oraclize_setCustomGasPrice(4 * (10 ** 9)); // Set price to 4 Gigawei
        oraclize_setProof(proofType_TLSNotary | proofStorage_IPFS);
        queryOraclarize();

    }

    function __callback(bytes32 myid, string result, bytes proof) {
        if (msg.sender != oraclize_cbAddress()) throw;
        
        uint milliUsdPerEth = stringToUint(result); // TODO: extra checks
        LogUpdate(milliUsdPerEth);
        if (milliUsdPerEth > 0 && address(bettingon)!=0) {
            bettingon.updateEthPrice(milliUsdPerEth);
        }
        queryOraclarize();
    }
    
    function queryOraclarize() payable {
        if (oraclize.getPrice("URL") > this.balance) {
            LogError("Oraclize query was NOT sent, please add some ETH to cover for the query fee");
            return;
        }
        oraclize_query(delay, "URL", url);
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

    function terminate() {
        assert(msg.sender == owner);
        selfdestruct(owner);
    }
}

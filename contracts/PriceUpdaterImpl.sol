pragma solidity ^0.4.11;

import "./Bettingon.sol";
import "./PriceUpdater.sol";
import "./lib/OraclizeAPI04.sol";

contract PriceUpdaterImpl is PriceUpdater, usingOraclize {
   
   event LogError(string error);
   event LogUpdate(uint value);

   address   public owner;
   Bettingon public bettingon; 
   string    public url;

   mapping(bytes32=>uint) roundIdPerMyId; 

    function PriceUpdaterImpl(address _owner) {
        owner = _owner;
    }

    function initialize(address oar, address _bettingon, string _url) {
        assert(msg.sender == owner);

        bettingon = Bettingon(_bettingon);
        url = _url;     // "json(https://api.coinmarketcap.com/v1/ticker/ethereum/).0.price_usd"

        if (oar != 0 ) {
            OAR = OraclizeAddrResolverI(oar);
        }

        oraclize_setCustomGasPrice(4 * (10 ** 9)); // Set price to 4 Gigawei
        oraclize_setProof(proofType_TLSNotary | proofStorage_IPFS);
    }

    function __callback(bytes32 myid, string result, bytes proof) {
        if (msg.sender != oraclize_cbAddress()) throw;

        assert(roundIdPerMyId[myid]>0);
        uint roundId=roundIdPerMyId[myid]-1;
        
        uint target = stringToUint(result); // TODO: extra checks
        LogUpdate(target);
        if (target > 0 && address(bettingon)!=0) {
            bettingon.setTargetValue(roundId,target);
        }
    }
    
    function schedule(uint _roundId, uint _timeOffset) {
        assert(msg.sender == address(bettingon));

        if (oraclize.getPrice("URL") > this.balance) {
            LogError("Insuficient amount");
            return;
        }        
        
        bytes32 myid = oraclize_query(_timeOffset, "URL", url);
        roundIdPerMyId[myid]=_roundId+1;
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


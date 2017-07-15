pragma solidity ^0.4.11;

contract Bettingon {

    /*
       Flow diagram for RoundStatus
      
       OPEN -> CLOSED -> PRICEWAIT -> PRICESET  -> RESOLVED -> FINISHED
                                   \> PRICELOST
    */
   
    enum RoundStatus {
        FUTURE,        // Not exists yet
        OPEN,          // Open to bets
        CLOSED,        // Closed to bets, waiting oracle to set the price
        PRICEWAIT,     // Waiting oracle to set the price        
        PRICESET,      // Oracle set the price, calculating best bet
        PRICELOST,     // Oracle cannot set the price [end]
        RESOLVED,      // Bet calculated
        FINISHED       // Bet paid
    }

    function bet(uint _roundId, uint _target) payable;
    function refund(uint _roundId);
    function forceResolveRound(uint _roundId);
    function updateEthPrice(uint _milliDollarsPerEth);
    function terminate(uint _stopAtRound);

    function getRoundById(uint _roundId, uint _now) external constant returns (
        uint roundId,
        uint roundNo,
        RoundStatus status,
        uint closeDate,
        uint betCount,
        uint target,
        uint lastCheckedBetNo,
        uint closestBetNo
    );

    function isBetAvailable(uint _target, uint _now) returns (bool);

    function getRoundCount(uint _now) external constant returns (uint);

    function getRoundAt(uint _roundNo,uint _now) constant returns (
        uint roundId,
        RoundStatus status,
        uint closeDate,
        uint betCount,
        uint target,
        uint lastCheckedBetNo,
        uint closestBetNo
    );
    
    function getBetAt(uint _roundNo, uint _betNo) external constant returns (
        address account,
        uint    target
    );
    
    function getNow() external constant returns (uint);

}

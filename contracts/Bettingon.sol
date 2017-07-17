pragma solidity ^0.4.11;

import "./Directory.sol";
import "./PriceUpdater.sol";

contract Bettingon {

    /// events -------------------------------------------------

    event Log(address v);
    event LogError(string error);
    event LogWinner(uint roundId, address winner);
    event LogWinnerPaid(uint roundId, address winner, uint amount, uint boat);
    event LogBet(uint roundId, address account, uint target);
    event LogBetOutdated(uint roundId, address account, uint target);
    event LogRefund(uint roundId, address account, uint amount);
    event LogPriceSet(uint roundId, uint target);

    /// types ---------------------------------------------------

    struct Bet {
        address account;
        uint    target;     // in ethers
    }

    struct Round {
        uint                   roundId;     // the id of the round

        uint                   balance;     // total money balance 
        uint                   closeDate;   // date this round closes

        uint                   target;      // is the goal price

        Bet[]                  bets;
        mapping(uint=>Bet)     betTargets;
        mapping(address=>uint) amountPerAddress;

        uint                   lastCheckedBetNo;
        uint                   closestBetNo;
    }

    /// inmutable construction parameters ----------------------

    uint         public betCycleLength;      // how long the bet cicle lasts. eg 1 day
    uint         public betCycleOffset;      // the offset of the betting cicle
    uint         public betMinRevealLength;  // minimum time for revealig target
    uint         public betMaxRevealLength;  // maxmimum time for revealig target
    uint         public betAmount;
    uint         public platformFee;         // percentage that goes to sharePlatform
    address      public platformFeeAddress;  // address where foes the platfromFee
    uint         public boatFee;             // boat for the bet that matches the amount
    PriceUpdater public priceUpdater;        // who is allowed to update the price
    Directory    public directory;
    address      public owner;

    /// state variables ----------------------------------------

    Round[]   public        rounds;
    mapping   (uint=>uint)  roundById;
    uint      public        lastRevealedRound;
    uint      public        resolvingRound;
    uint      public        boat;
    uint      public        stopAtRound;

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

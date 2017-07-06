pragma solidity ^0.4.11;

import "./SafeMath.sol";

contract TheProject {
    
    using SafeMath for uint;

    uint constant public TIME_REVEAL = 14 days;
    uint constant public BET_AMOUNT_IN_DOLLARS = 1000;

    event LogError(string error);
    event LogPrize(uint round, address winner, uint amount);
    event LogBet(address account, address target, uint amount);

    struct Bet {
        address account;
        uint    target;     // in ethers
    }
    
    /*
    Flow diagram status
      
    OPEN -> CLOSED -> TARGETSET  -> RESOLVED
                   \> TARGETLOST
    */
    
    enum RoundStatus {
        OPEN,          // Open to bets
        CLOSED,        // Closed to bets, waiting oracle to set the price
        TARGETSET,     // Oracle set the price, calculating best bet
        TARGETLOST,    // Oracle cannot set the price [end]
        RESOLVED,      // Bet calculated & paid [end]
        UNKNOWN
    }

    struct Round {
        uint     betAmount;
        uint     closeDate;  // date this round closes
        uint     revealDate; // date the winner is revealed

        Bet[]    bets;
        
        uint     target;      // is the goal price

        uint     lastCheckedBetNo;
        uint     closestBetNo;
    }

    Round[] public rounds;
    uint    public lastRevealedRound;
    uint    public resolvingRound;
    uint    public milliDollarsPerEth;
    uint    public round;


    function TheProject() {
        createRoundIfRequiered();
    }

    function getBetInEths() constant returns (uint) {
        uint eth = 1 ether;
        return eth.div(1000).div(milliDollarsPerEth.mul(BET_AMOUNT_IN_DOLLARS));
    } 

    function getRoundStatus(uint roundNo) constant returns (RoundStatus) {
        Round storage round = rounds[roundNo];
        
        if (now < round.closeDate) {
            return RoundStatus.OPEN;
        }
        if (round.lastCheckedBetNo == round.bets.length) {
            return RoundStatus.RESOLVED;            
        }
        if (round.target > 0) {
            return RoundStatus.TARGETSET;            
        }
        if (round.target == 0  && round.revealDate > now + 1 days) {
            return RoundStatus.TARGETLOST;
        }
        return RoundStatus.CLOSED;
    }

    function updateEthPrice(uint _milliDollarsPerEth) internal {
        
        milliDollarsPerEth = _milliDollarsPerEth;

        while (lastRevealedRound + 1 < rounds.length ) {
            if (getRoundStatus(lastRevealedRound+1)!=RoundStatus.CLOSED) {
                break;
            }
            if (now >= rounds[lastRevealedRound+1].revealDate &&
                now < rounds[lastRevealedRound+1].revealDate + 1 days) {
                rounds[lastRevealedRound+1].target = _milliDollarsPerEth;
            }
        }
        
    }

    function diff(uint a, uint b) internal returns (uint) {
       if (a > b) {
           return a.sub(b);
       } else {
           return b.sub(a);
       }
    }

    function forceResolveRound(uint roundNo) {
        resolveRound(roundNo, false);
    }

    function createRoundIfRequiered() internal {

        uint lastCloseDate;
        uint closeDate = ((now % 1 days) + 1) * 1 days;

        if (rounds.length > 0) {
            lastCloseDate = rounds[rounds.length-1].closeDate;
        } 
        
        if (lastCloseDate != closeDate) {
            rounds.length++;
            rounds[rounds.length-1].closeDate = closeDate;
            rounds[rounds.length-1].revealDate = closeDate.add(TIME_REVEAL);
            rounds[rounds.length-1].betAmount = getBetInEths();
        }
    }

    function autoResolvePreviousRounds() internal {
        
        RoundStatus status = getRoundStatus(resolvingRound);
        
        if (status==RoundStatus.TARGETSET) {
            resolveRound(resolvingRound,true);
        } else if (status==RoundStatus.RESOLVED) {
            resolvingRound++;
        }
    }

    function resolveRound(uint roundNo, bool onetime) internal {
  
        if (getRoundStatus(roundNo)!=RoundStatus.TARGETSET) {
            return;
        }
  
        Round round = rounds[roundNo];
  
        uint target           = round.target;
        uint lastCheckedBetNo = round.lastCheckedBetNo;
        uint closestBetNo     = round.closestBetNo;
  
        while (lastCheckedBetNo < round.bets.length) {
            
           if (lastCheckedBetNo == 0) {
               closestBetNo = lastCheckedBetNo + 1;
           } else {
               uint thisTarget = round.bets[lastCheckedBetNo].target;
               uint bestTarget = round.bets[closestBetNo].target;
               if (diff(thisTarget,target) < diff(bestTarget,target)) {
                    closestBetNo = lastCheckedBetNo;             
               }
           }
          
           lastCheckedBetNo++;

           if (onetime || msg.gas < 30000 ) {
               break;
           }
        }
        
        round.lastCheckedBetNo = lastCheckedBetNo;
        round.closestBetNo = closestBetNo;

        if (lastCheckedBetNo == round.bets.length) {
            
           if (lastCheckedBetNo > 0) {
               uint prize = round.betAmount * round.bets.length;
               round.bets[closestBetNo].account.transfer(prize);
               LogPrize(roundNo, round.bets[closestBetNo].account,prize);
           }
           
        }
    } 
    
    function bet(uint target) payable {
       
        createRoundIfRequiered(); 

        Round storage round = rounds[rounds.length-1];
       
        assert(msg.value >= round.betAmount);
        
        if (msg.value > round.betAmount) {
            msg.sender.transfer(msg.value.sub(round.betAmount));
        }

        round.bets.length++;
        round.bets[round.bets.length-1].account = msg.sender;
        round.bets[round.bets.length-1].target = target;

        autoResolvePreviousRounds();
        
    }

    /// web3 helpers ------------------------------------------------
    
    function getRoundCount() constant returns (uint) {
        return rounds.length;
    }
    function getRoundAt(uint roundNo) constant returns (
        uint closeDate,
        uint betAmount,
        uint betCount,
        uint target,
        uint lastCheckedBetNo,
        uint closestBetNo
    ) {
        closeDate = rounds[roundNo].closeDate;
        betAmount = rounds[roundNo].betAmount;
        betCount = rounds[roundNo].bets.length;
        target = rounds[roundNo].target;
        lastCheckedBetNo = rounds[roundNo].lastCheckedBetNo;
        closestBetNo = rounds[roundNo].closestBetNo;
    }
    
    function getBetAt(uint roundNo, uint betNo) constant returns (
        address account,
        uint    target
    ){
        account = rounds[roundNo].bets[betNo].account;
        target = rounds[roundNo].bets[betNo].target;
    }
}

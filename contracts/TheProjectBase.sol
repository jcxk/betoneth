pragma solidity ^0.4.11;

import "./SafeMath.sol";

contract TheProjectBase {
    
    using SafeMath for uint;

    // events -------------------------------------------------

    event Log(uint v);
    event LogError(string error);
    event LogPrize(uint round, address winner, uint amount);
    event LogBet(uint round, address account, uint target, uint amount);
    event LogRefund(uint round, address account, uint amount);
    event LogTargetSet(uint round, uint target);

    // types ---------------------------------------------------

    struct Bet {
        address account;
        uint    target;     // in ethers
    }
    
    /*
       Flow diagram for RoundStatus
      
       OPEN -> CLOSED -> TARGETSET  -> RESOLVED
                      \> TARGETLOST
    */
    
    enum RoundStatus {
        OPEN,          // Open to bets
        CLOSED,        // Closed to bets, waiting oracle to set the price
        TARGETSET,     // Oracle set the price, calculating best bet
        TARGETLOST,    // Oracle cannot set the price [end]
        RESOLVED       // Bet calculated & paid [end]
    }

    struct Round {
        uint     betAmount;
        uint     closeDate;  // date this round closes

        Bet[]                  bets;
        mapping(uint=>Bet)     betTargets;
        mapping(address=>uint) amountPerAddress;
        
        uint     target;      // is the goal price

        uint     lastCheckedBetNo;
        uint     closestBetNo;
    }

    // inmutable construction parameters ----------------------

    uint public betCycleLength;      // how long the bet cicle lasts. eg 1 day
    uint public betCycleOffset;      // the offset of the betting cicle
    uint public betMinRevealLength;  // minimum time for revealig target
    uint public betMaxRevealLength;  // maxmimum time for revealig target
    uint public betAmountInDollars;

    // state variables ----------------------------------------

    Round[] public rounds;
    uint    public lastRevealedRound;
    uint    public resolvingRound;
    uint    public milliDollarsPerEth;
    uint    public round;

    // code ===================================================

    function TheProjectBase(
        uint _betCycleLength,
        uint _betCycleOffset,
        uint _betMinRevealLength,
        uint _betMaxRevealLength,
        uint _betAmountInDollars
        ) {

      betCycleOffset = _betCycleOffset;
      betCycleLength = _betCycleLength;
      betMinRevealLength = _betMinRevealLength;
      betMaxRevealLength = _betMaxRevealLength;
      betAmountInDollars = _betAmountInDollars;

    }

    function getBetInEths() constant returns (uint) {
        uint eth = 1 ether;
        return eth.div(1000).div(milliDollarsPerEth.mul(betAmountInDollars));
    } 

    function getRoundStatus(uint _roundNo) constant returns (RoundStatus) {
        Round storage round = rounds[_roundNo];
        
        if (now < round.closeDate) {
            return RoundStatus.OPEN;
        }
        if (round.lastCheckedBetNo == round.bets.length) {
            return RoundStatus.RESOLVED;            
        }
        if (round.target > 0) {
            return RoundStatus.TARGETSET;            
        }
        if (round.target == 0  && now > round.closeDate.add(betMaxRevealLength)) {
            return RoundStatus.TARGETLOST;
        }
        return RoundStatus.CLOSED;
    }

    function updateEthPrice(uint _milliDollarsPerEth) internal {
        
        milliDollarsPerEth = _milliDollarsPerEth;

        while (lastRevealedRound  < rounds.length ) {

            RoundStatus status = getRoundStatus(lastRevealedRound);

            // if the round is open, end loop
            if (status == RoundStatus.OPEN) {
                break;
            }

            // if the round is not closed, skip it
            if ( status != RoundStatus.CLOSED ) {
                lastRevealedRound++;
                continue;   
            }

            // invariant : status == CLOSED
            // if round CLOSED and in reveal dates, set price

            bool startOk =
                now >= rounds[lastRevealedRound].closeDate.add(betMinRevealLength);
            
            bool endOk =
                now < rounds[lastRevealedRound].closeDate.add(betMaxRevealLength);

            if (startOk && endOk) {
                
                rounds[lastRevealedRound].target = _milliDollarsPerEth;

                LogTargetSet(lastRevealedRound,_milliDollarsPerEth);
                lastRevealedRound++;
                break;

            } else {

                // if not, just wait
                break;
            }

        }
        
    }

    function forceResolveRound(uint _roundNo) {
        resolveRound(_roundNo, false);
    }

    function createRoundIfRequiered() {

       uint startDate = now.sub(now % betCycleLength).add(betCycleOffset);
       uint closeDate = startDate.add(betCycleLength);

       uint lastCloseDate;
       if (rounds.length > 0) {
            lastCloseDate = rounds[rounds.length-1].closeDate;
        } 
 
        if (lastCloseDate != closeDate) {
            rounds.length++;
         
            rounds[rounds.length-1].closeDate = closeDate;
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

    function resolveRound(uint _roundNo, bool _onetime) internal {
  
        if (getRoundStatus(_roundNo)!=RoundStatus.TARGETSET) {
            return;
        }
  
        Round round = rounds[_roundNo];
  
        uint target           = round.target;
        uint lastCheckedBetNo = round.lastCheckedBetNo;
        uint closestBetNo     = round.closestBetNo;
  
        while (lastCheckedBetNo < round.bets.length) {
            
           if (lastCheckedBetNo == 0) {
               closestBetNo = 0;
           } else {
               uint thisTarget = round.bets[lastCheckedBetNo].target;
               uint bestTarget = round.bets[closestBetNo].target;
               if (diff(thisTarget,target) < diff(bestTarget,target)) {
                    closestBetNo = lastCheckedBetNo;             
               }
           }
          
           lastCheckedBetNo++;

           if (_onetime || msg.gas < 100000 ) {
               break;
           }
        }
        
        round.lastCheckedBetNo = lastCheckedBetNo;
        round.closestBetNo = closestBetNo;

        if (lastCheckedBetNo == round.bets.length) {
            
           if (lastCheckedBetNo > 0) {
               uint prize = round.betAmount * round.bets.length;
               round.bets[closestBetNo].account.transfer(prize);
               LogPrize(_roundNo, round.bets[closestBetNo].account,prize);
           }
           
        }
    } 
    
    function bet(uint _target) payable {
       
        createRoundIfRequiered(); 

        Round storage round = rounds[rounds.length-1];
       
        if (round.betTargets[_target].account != 0 ) {
            revert();
        }

        require(msg.value >= round.betAmount);
        
        if (msg.value > round.betAmount) {
            msg.sender.transfer(msg.value.sub(round.betAmount));
        }

        round.bets.length++;
        round.bets[round.bets.length-1].account = msg.sender;
        round.bets[round.bets.length-1].target = _target;

        round.betTargets[_target] = round.bets[round.bets.length-1];
        round.amountPerAddress[msg.sender] = 
            round.amountPerAddress[msg.sender].add(round.betAmount);

        LogBet(rounds.length-1,msg.sender,_target,round.betAmount);

        autoResolvePreviousRounds();
    }

    function refundBadRound(uint _roundNo) {

        if (getRoundStatus(_roundNo)!=RoundStatus.TARGETLOST) {
            return;
        }

        Round storage round = rounds[_roundNo];
        uint amount = round.amountPerAddress[msg.sender];
        if (amount > 0) {
            round.amountPerAddress[msg.sender] = 0;
            msg.sender.transfer(amount);
            LogRefund(_roundNo,msg.sender,amount);
        }
    }

    // web3 helpers ------------------------------------------------

    function getCurrentRound() constant returns (uint) {
        if (getRoundStatus(rounds.length-1)==RoundStatus.OPEN) {
            return rounds.length-1;
        }
        return rounds.length;
    }

    function isBetAvailable(uint _target) returns (bool) {

        if (getRoundStatus(rounds.length-1)!=RoundStatus.OPEN) {
            return true;
        }

        return rounds[rounds.length-1].betTargets[_target].account == 0;
    }
    
    function remainingRoundTime() constant returns (uint) {

        if (rounds[rounds.length-1].closeDate > now) {
            return rounds[rounds.length-1].closeDate.sub(now);
        }

        return 0;
    }

    function remainingRevealTime(uint _roundNo) constant returns (uint) {

        uint revealTime = rounds[_roundNo].closeDate.add(betMinRevealLength);    

        if (revealTime > now) {
            return revealTime.sub(now);
        }

        return 0;
    }

    function getRoundCount() constant returns (uint) {
        return rounds.length;
    }

    function getRoundAt(uint _roundNo) constant returns (
        uint closeDate,
        uint betAmount,
        uint betCount,
        uint target,
        uint lastCheckedBetNo,
        uint closestBetNo
    ) {
        if (_roundNo == rounds.length) {

            uint startDate = now.sub(now % betCycleLength).add(betCycleOffset);
            closeDate = startDate.add(betCycleLength);
            betAmount = getBetInEths();
            betCount = 0;
            target = 0;
            lastCheckedBetNo = 0;
            closestBetNo = 0;

            return;
        }

        closeDate = rounds[_roundNo].closeDate;
        betAmount = rounds[_roundNo].betAmount;
        betCount = rounds[_roundNo].bets.length;
        target = rounds[_roundNo].target;
        lastCheckedBetNo = rounds[_roundNo].lastCheckedBetNo;
        closestBetNo = rounds[_roundNo].closestBetNo;
    }
    
    function getBetAt(uint _roundNo, uint _betNo) constant returns (
        address account,
        uint    target
    ){
        account = rounds[_roundNo].bets[_betNo].account;
        target = rounds[_roundNo].bets[_betNo].target;
    }
    
    // generic helpers ------------------------------------------------

    function diff(uint _a, uint _b) internal returns (uint) {
       if (_a > _b) {
           return _a.sub(_b);
       } else {
           return _b.sub(_a);
       }
    }

}

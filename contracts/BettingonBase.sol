pragma solidity ^0.4.11;

import "./SafeMath.sol";

contract BettingonBase {

    using SafeMath for uint;

    /// events -------------------------------------------------

    event Log(uint v);
    event LogError(string error);
    event LogWinner(uint round, address winner);
    event LogWinnerPaid(uint round, address winner, uint amount, uint boat);
    event LogBet(uint round, address account, uint target, uint amount);
    event LogRefund(uint round, address account, uint amount);
    event LogTargetSet(uint round, uint target);

    /// types ---------------------------------------------------

    struct Bet {
        address account;
        string  comment;
        uint    target;     // in ethers
    }
   
    /*
       Flow diagram for RoundStatus
      
       OPEN -> CLOSED -> TARGETWAIT -> TARGETSET  -> RESOLVED -> PAID
                                    \> TARGETLOST
    */
   
    enum RoundStatus {
        FUTURE,        // Not exists yet
        OPEN,          // Open to bets
        CLOSED,        // Closed to bets, waiting oracle to set the price
        TARGETWAIT,    // Waiting oracle to set the price        
        TARGETSET,     // Oracle set the price, calculating best bet
        TARGETLOST,    // Oracle cannot set the price [end]
        RESOLVED,      // Bet calculated
        PAID           // Bet paid
    }

    struct Round {

        uint     balance;    // total money balance 
        uint     betAmount;  // bet amount 
        uint     closeDate;  // date this round closes

        uint     target;     // is the goal price
        bool     paid;       // is round has been paid

        Bet[]                  bets;
        mapping(uint=>Bet)     betTargets;
        mapping(address=>uint) amountPerAddress;


        uint     lastCheckedBetNo;
        uint     closestBetNo;
    }

    /// inmutable construction parameters ----------------------

    uint    public betCycleLength;      // how long the bet cicle lasts. eg 1 day
    uint    public betCycleOffset;      // the offset of the betting cicle
    uint    public betMinRevealLength;  // minimum time for revealig target
    uint    public betMaxRevealLength;  // maxmimum time for revealig target
    uint    public betAmountInDollars;
    uint    public platformFee;         // percentage that goes to sharePlatform
    address public platformFeeAddress;  // address where foes the platfromFee
    uint    public boatFee;             // boat for the bet that matches the amount

    /// state variables ----------------------------------------

    Round[] public rounds;
    uint    public lastRevealedRound;
    uint    public resolvingRound;
    uint    public milliDollarsPerEth;
    uint    public boat;

    /// code ===================================================

    function BettingonBase(
        uint    _betCycleLength,
        uint    _betCycleOffset,
        uint    _betMinRevealLength,
        uint    _betMaxRevealLength,
        uint    _betAmountInDollars,
        uint    _platformFee,
        address _platformFeeAddress,
        uint    _boatFee
        ) {

      betCycleOffset = _betCycleOffset;
      betCycleLength = _betCycleLength;
      betMinRevealLength = _betMinRevealLength;
      betMaxRevealLength = _betMaxRevealLength;
      betAmountInDollars = _betAmountInDollars;
      platformFee = _platformFee;
      platformFeeAddress = _platformFeeAddress;
      boatFee = _boatFee;

      assert(!isContract(_platformFeeAddress));

      milliDollarsPerEth = 250000; // set initial fake value

    }

    function getBetInEths() constant returns (uint) {
        uint eth = 1 ether;
        return eth.div(1000).div(milliDollarsPerEth.mul(betAmountInDollars));
    } 

    function getRoundStatus(uint _roundNo, uint _now) constant returns (RoundStatus) {

        if (_now == 0) {
            _now = now;
        }

        if (_roundNo > rounds.length) {
            return RoundStatus.FUTURE;
        }

        if (_roundNo == rounds.length) {
            if (rounds.length>0 && rounds[_roundNo-1].closeDate > _now) {
                return RoundStatus.FUTURE;
            }
            return RoundStatus.OPEN;
        }

        Round storage round = rounds[_roundNo];
        
        if (round.paid) {
            return RoundStatus.PAID;
        }
        if (_now < round.closeDate) {
            return RoundStatus.OPEN;
        }
        if (round.lastCheckedBetNo == round.bets.length) {
            assert(round.target > 0);
            return RoundStatus.RESOLVED;            
        }
        if (round.target > 0) {
            return RoundStatus.TARGETSET;            
        }
        if (round.target == 0  && _now > round.closeDate.add(betMaxRevealLength)) {
            return RoundStatus.TARGETLOST;
        }
        if (round.target == 0  && _now > round.closeDate.add(betMinRevealLength)) {
            return RoundStatus.TARGETWAIT;
        }
        return RoundStatus.CLOSED;
    }

    function updateEthPrice(uint _milliDollarsPerEth) internal {
        
        milliDollarsPerEth = _milliDollarsPerEth;

        while (lastRevealedRound < rounds.length ) {

            RoundStatus status = getRoundStatus(lastRevealedRound, now);

            if (status == RoundStatus.TARGETWAIT) {
                
                rounds[lastRevealedRound].target = _milliDollarsPerEth;

                LogTargetSet(lastRevealedRound,_milliDollarsPerEth);
                lastRevealedRound++;
                break;

            } else if (status <= RoundStatus.CLOSED) {
                break;
            } 

            rounds.length++;

        }
        
    }

    function forceResolveRound(uint _roundNo) {
        resolveRound(_roundNo, false);
    }

    function createRoundIfRequiered() {

       uint closeDate = thisRoundCloseDate();
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

        RoundStatus status = getRoundStatus(resolvingRound,now);
        
        if (status==RoundStatus.TARGETSET) {
            resolveRound(resolvingRound,true);
        } else if (status > RoundStatus.OPEN) {
            resolvingRound++;
        }

    }

    function resolveRound(uint _roundNo, bool _onetime) internal {
  
        if (getRoundStatus(_roundNo,now)!=RoundStatus.TARGETSET) {
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

        if (lastCheckedBetNo == round.bets.length) {
            LogWinner(_roundNo, round.bets[closestBetNo].account);
        }
        
        round.lastCheckedBetNo = lastCheckedBetNo;
        round.closestBetNo = closestBetNo;

    } 
   
    function bet(uint _target, string _comment) payable {

        // assert(!isContract(msg.sender)); -- crashes testrpc evm_estimategas!

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
        round.bets[round.bets.length-1].comment = _comment;

        round.betTargets[_target] = round.bets[round.bets.length-1];
        round.amountPerAddress[msg.sender] = 
            round.amountPerAddress[msg.sender].add(round.betAmount);

        round.balance = round.balance.add(round.betAmount);

        LogBet(rounds.length-1,msg.sender,_target,round.betAmount);

        autoResolvePreviousRounds();

    }

    function refund(uint _roundNo) {

        RoundStatus status = getRoundStatus(_roundNo,now);
        
        if(status == RoundStatus.OPEN) {
            return;
        }

        Round storage round = rounds[_roundNo];

        // if this round is >closed, and there's only
        //   one betting address, just refund money

        if (round.balance == round.amountPerAddress[round.bets[0].account]
            && round.bets[0].account == msg.sender) {

            msg.sender.transfer(round.balance);
            LogRefund(_roundNo, round.bets[0].account,round.balance);
            round.amountPerAddress[round.bets[0].account] = 0;
            round.balance = 0;
            return;
        }

        // if this round is target lost, just refund money
        //   one betting address, just refund money

        if (status == RoundStatus.TARGETLOST) {
            uint amount = round.amountPerAddress[msg.sender];
            if (amount > 0) {
                round.balance = round.balance.sub(amount);
                round.amountPerAddress[msg.sender] = 0;
                msg.sender.transfer(amount);
                LogRefund(_roundNo,msg.sender,amount);
            }
            return;
        }

        // otherwise, check for the winner
        //

        if(getRoundStatus(_roundNo,now)!=RoundStatus.RESOLVED) {
            return;
        }

        address winner = round.bets[round.closestBetNo].account;
        if(msg.sender != winner){
            return;
        }

        round.paid=true;
        assert(getRoundStatus(_roundNo,now)==RoundStatus.PAID);

        uint platformAmount = percentage(round.balance,platformFee);
        uint boatAmount = percentage(round.balance,boatFee);
        uint winnerAmount = round.balance.sub(platformAmount).sub(boatAmount);

        winner.transfer(winnerAmount);
        platformFeeAddress.transfer(platformAmount);
        boat=boat.add(boatAmount);

        if (round.bets[round.closestBetNo].target == round.target) {
            LogWinnerPaid(_roundNo, winner, winnerAmount, boat);
            boat = 0;
            winner.transfer(boat);
        } else {
            LogWinnerPaid(_roundNo, winner, winnerAmount, 0);            
        }            

    }

    // web3 helpers ------------------------------------------------

    function getCurrentRound(uint _now) constant returns (uint) {
        // if starting, current round is zero
        if (rounds.length == 0) {
            return 0;
        }
        // if last round is open, then return last round
        if (getRoundStatus(rounds.length-1,_now)==RoundStatus.OPEN) {
            return rounds.length-1;
        }
        // return the new round
        return rounds.length;
    }

    function isBetAvailable(uint _target, uint _now) returns (bool) {

        if (getRoundStatus(rounds.length-1, _now)!=RoundStatus.OPEN) {
            return true;
        }

        return rounds[rounds.length-1].betTargets[_target].account == 0;
    }
    
    function getRoundCount(uint _now) external constant returns (uint) {
        if (getRoundStatus(rounds.length,_now) == RoundStatus.OPEN) {
            return rounds.length + 1;
        }
        return rounds.length;
    }

    function getRoundAt(uint _roundNo,uint _now) external constant returns (
        RoundStatus status,
        uint closeDate,
        uint betAmount,
        uint betCount,
        uint target,
        uint lastCheckedBetNo,
        uint closestBetNo
    ) {
        
        status = getRoundStatus(_roundNo, _now);

        if (_roundNo == rounds.length) {

            uint startDate = thisRoundCloseDate();
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
    
    function getBetAt(uint _roundNo, uint _betNo) external constant returns (
        address account,
        uint    target,
        string  comment
    ){
        account = rounds[_roundNo].bets[_betNo].account;
        target = rounds[_roundNo].bets[_betNo].target;
        comment = rounds[_roundNo].bets[_betNo].comment;
    }
    
    function thisRoundCloseDate() internal returns (uint) {
       uint startDate = now.sub(now % betCycleLength).add(betCycleOffset);
       return startDate.add(betCycleLength);
    }

    function getNow() external constant returns (uint) {
        return now;
    }

    /// generic helpers ------------------------------------------------

    function isContract(address addr) internal returns (bool) {
      uint size;
      assembly { size := extcodesize(addr) }
      return size > 0;
    }

    function percentage(uint _amount, uint _perc) internal constant returns (uint) {
        return _amount.mul(10**16).mul(_perc).div(10**18);
    }

    function diff(uint _a, uint _b) internal constant returns (uint) {
       if (_a > _b) {
           return _a.sub(_b);
       } else {
           return _b.sub(_a);
       }
    }
    
}
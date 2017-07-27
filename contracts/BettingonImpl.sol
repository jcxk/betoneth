pragma solidity ^0.4.11;

import "./lib/SafeMath.sol";
import "./Bettingon.sol";

contract BettingonImpl is Bettingon {

    using SafeMath for uint;

    /// code ===================================================

    event LogDebug(string what);

    function BettingonImpl(
        address _owner,
        address _priceUpdaterAddress,
        address _directoryAddress,
        uint    _betCycleLength,
        uint    _betCycleOffset,
        uint    _betMinRevealLength,
        uint    _betMaxRevealLength,
        uint    _betAmount,
        uint    _platformFee,
        address _platformFeeAddress,
        uint    _boatFee
        ) {

      owner = _owner;

      betCycleOffset = _betCycleOffset;
      betCycleLength = _betCycleLength;
      betMinRevealLength = _betMinRevealLength;
      betMaxRevealLength = _betMaxRevealLength;
      betAmount = _betAmount;
      platformFee = _platformFee;
      platformFeeAddress = _platformFeeAddress;
      boatFee = _boatFee;

      priceUpdater = PriceUpdater(_priceUpdaterAddress);
      directory = Directory(_directoryAddress);

      assert(!isContract(_platformFeeAddress));

    }

    function bet(uint _roundId, uint[] _targets) payable {

        assert(_targets.length > 0);

        // -- check that the bet is not outdated due network congestion
        var (roundId,) = thisRoundInfo(now);
        
        if (roundId!=_roundId) {
            LogBetOutdated(_roundId,msg.sender,_targets);
            msg.sender.transfer(msg.value);
            return;
        }

        // -- check owner finished this bettington
        assert(stopAtRound < roundId);

        // -- check if the user is in the directory
        assert(address(directory)==0 || directory.isAllowed(msg.sender));

        // -- check sent value is, at least the minimum value
        uint totalBetAmount = betAmount.mul(_targets.length);
        assert(msg.value >= totalBetAmount);

        // -- check if someone already bet on this target
        if (msg.value > betAmount) {
            msg.sender.transfer(msg.value.sub(totalBetAmount));
        }

        // -- create a new round if requiered
        createRoundIfRequiered();

        for (uint targetNo = 0; targetNo < _targets.length ; targetNo++) {

            uint target = _targets[targetNo];

            // -- check if someone already bet on this target
            Round storage round = rounds[rounds.length-1];       
            if (round.betTargets[target].account != 0 ) {
                revert();
            }

            round.bets.length++;
            round.bets[round.bets.length-1].account = msg.sender;
            round.bets[round.bets.length-1].target = target;

            round.betTargets[target] = round.bets[round.bets.length-1];
            round.amountPerAddress[msg.sender] = 
                round.amountPerAddress[msg.sender].add(betAmount);

            round.balance = round.balance.add(betAmount);

        }
        LogBet(_roundId,msg.sender,_targets);
        
    }

    function withdraw(uint _roundId) {

        uint roundNo = roundById[_roundId];
        RoundStatus status = getRoundStatus(roundNo,now);
        
        if(status == RoundStatus.OPEN) {
            return;
        }
        Round storage round = rounds[roundNo];

        // if this round is >closed, and there's only
        //   one betting address, just refund money

        if (round.balance == round.amountPerAddress[round.bets[0].account]
            && round.bets[0].account == msg.sender) {

            msg.sender.transfer(round.balance);
            LogRefund(round.roundId, round.bets[0].account,round.balance);
            round.amountPerAddress[round.bets[0].account] = 0;
            round.balance = 0;
            return;
        }

        // if this round is target lost, just refund money
        //   one betting address, just refund money

        if (status == RoundStatus.PRICELOST) {
            uint amount = round.amountPerAddress[msg.sender];
            if (amount > 0) {
                round.balance = round.balance.sub(amount);
                round.amountPerAddress[msg.sender] = 0;
                msg.sender.transfer(amount);
                LogRefund(round.roundId,msg.sender,amount);
            }
            return;
        }

        // We assume there that the winner is calling this function because
        //   is the winner, and wants to retrieve their price

        if(getRoundStatus(roundNo,now)==RoundStatus.PRICESET) {
            
            // The round is not yet resolved, so resolve it
            // We have two different strategies here:
            //
            //   1) if there's less that XXX pending bets to process 
            //      resolve them all
            //   2) if there's more than XXX pending transactions
            //      forceResolveRound should be called

            uint pendingRounds = round.bets.length - round.lastCheckedBetNo + 1 ;

            if (pendingRounds > 10) {
                return;
            }

            resolveRoundNo(roundNo,pendingRounds);
        }

        if(getRoundStatus(roundNo,now)!=RoundStatus.RESOLVED) {
            return;
        }

        address winner = round.bets[round.closestBetNo].account;
        if(msg.sender != winner){
            return;
        }

        uint platformAmount = percentage(round.balance,platformFee);
        uint boatAmount = percentage(round.balance,boatFee);
        uint winnerAmount = round.balance.sub(platformAmount).sub(boatAmount);

        winner.transfer(winnerAmount);
        platformFeeAddress.transfer(platformAmount);
        boat=boat.add(boatAmount);

        if (round.bets[round.closestBetNo].target == round.target) {
            LogWinnerPaid(round.roundId, winner, winnerAmount, boat);
            winner.transfer(boat);
            boat = 0;
        } else {
            LogWinnerPaid(round.roundId, winner, winnerAmount, 0);            
        }

        round.balance = 0;   

    }

    function updateEthPrice(uint _milliDollarsPerEth) {
        
        assert(address(priceUpdater)==msg.sender || address(priceUpdater)==address(this));

        while (lastRevealedRound < rounds.length ) {

            RoundStatus status = getRoundStatus(lastRevealedRound, now);

            if (status == RoundStatus.PRICEWAIT) {
                
                rounds[lastRevealedRound].target = _milliDollarsPerEth;

                LogPriceSet(rounds[lastRevealedRound].roundId,_milliDollarsPerEth);
                lastRevealedRound++;
                break;

            } else if (status <= RoundStatus.CLOSED) {
                break;
            } 

            lastRevealedRound++;

        }
        
    }

    function terminate(uint _stopAtRound) {
        assert (msg.sender == owner );

        stopAtRound = _stopAtRound;
    }

    // internal functions ------------------------------------------

    function getRoundStatus(uint _roundNo, uint _now) internal constant returns (RoundStatus) {

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
        
        if (_now < round.closeDate) {
            return RoundStatus.OPEN;
        }

        if (round.balance == 0) {
            return RoundStatus.FINISHED;            
        }

        if (round.lastCheckedBetNo == round.bets.length) {
            assert(round.target > 0);
            return RoundStatus.RESOLVED;            
        }

        if (round.target > 0) {
            return RoundStatus.PRICESET;            
        }

        if (round.target == 0  && _now > round.closeDate.add(betMaxRevealLength)) {
            return RoundStatus.PRICELOST;
        }

        if (round.target == 0  && _now > round.closeDate.add(betMinRevealLength)) {
            return RoundStatus.PRICEWAIT;
        }

        return RoundStatus.CLOSED;
    }


    function thisRoundInfo(uint _now) internal returns (uint roundId, uint closeDate) {

        if (_now == 0) {
            _now = now;
        }

       roundId = _now / betCycleLength;
       uint startDate = _now.sub(_now % betCycleLength).add(betCycleOffset);
       closeDate = startDate.add(betCycleLength);
       return;
    }

    function createRoundIfRequiered() internal {

       var (roundId,closeDate) = thisRoundInfo(now);
       uint lastRoundId=0;

       if (rounds.length > 0) {
            lastRoundId = rounds[rounds.length-1].roundId;
        } 
 
        if (lastRoundId != roundId) {
            rounds.length++;
            
            rounds[rounds.length-1].roundId = roundId;
            rounds[rounds.length-1].closeDate = closeDate;

            roundById[roundId] = rounds.length-1;
            
            priceUpdater.schedule(closeDate-now+betMinRevealLength);
        }
    }

    function resolve(uint _roundId, uint _times) {
        resolveRoundNo(roundById[_roundId],_times);
    }

    /// _times < 0 => gas limit , times > 0 just do it n times maximum
    function resolveRoundNo(uint _roundNo, uint _times) internal {

        if (getRoundStatus(_roundNo,now)!=RoundStatus.PRICESET) {
            return;
        }
  
        Round storage round = rounds[_roundNo];
  
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

           bool noMoreGasToNextResolve   = ( _times==0 && msg.gas < 50000) ;
           bool noMoreTimesToNextResolve = ( _times==1 );

           if (noMoreGasToNextResolve || noMoreTimesToNextResolve) {
              break;
           }

           if (_times>1) _times--;
        }

        if (lastCheckedBetNo == round.bets.length) {
            LogWinner(round.roundId, round.bets[closestBetNo].account);
        }
        
        round.lastCheckedBetNo = lastCheckedBetNo;
        round.closestBetNo = closestBetNo;

    } 

    // web3 helpers ------------------------------------------------

    function getRoundById(uint _roundId, uint _now) external constant returns (
        uint        roundId,
        uint        roundNo,
        RoundStatus status,
        uint        closeDate,
        uint        betCount,
        uint        target,
        uint        lastCheckedBetNo,
        uint        closestBetNo
    ) {
        if (_roundId == 0) {
            // determine the last round 
            if (rounds.length == 0) {
                roundNo = 0;
            } else if (getRoundStatus(rounds.length-1,_now)==RoundStatus.OPEN) {
                // if last round is open, then return last round
                roundNo = rounds.length-1;
            } else  {
                // return the new round
                roundNo = rounds.length;
            }
        } else {
            roundNo = roundById[_roundId];
        }

        (roundId,status,closeDate,betCount,target,lastCheckedBetNo,closestBetNo) = 
           getRoundAt(roundNo,_now);
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

    function getRoundAt(uint _roundNo,uint _now) constant returns (
        uint        roundId,
        RoundStatus status,
        uint        closeDate,
        uint        betCount,
        uint        target,
        uint        lastCheckedBetNo,
        uint        closestBetNo
    ) {
        
        status = getRoundStatus(_roundNo, _now);

        if (_roundNo >= rounds.length) {

            (roundId,closeDate) = thisRoundInfo(_now);
            betCount = 0;
            target = 0;
            lastCheckedBetNo = 0;
            closestBetNo = 0;
            return;
        }

        roundId = rounds[_roundNo].roundId;
        closeDate = rounds[_roundNo].closeDate;
        betCount = rounds[_roundNo].bets.length;
        target = rounds[_roundNo].target;
        lastCheckedBetNo = rounds[_roundNo].lastCheckedBetNo;
        closestBetNo = rounds[_roundNo].closestBetNo;
        return;
    }
    
    function getBetAt(uint _roundNo, uint _betNo) external constant returns (
        address account,
        uint    target
    ){
        account = rounds[_roundNo].bets[_betNo].account;
        target = rounds[_roundNo].bets[_betNo].target;
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

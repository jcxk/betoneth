// This test suite corresponds to the old Vault test suite

/* global artifacts */
/* global contract */
/* global web3 */
/* global assert */

const assertJump = require("./helpers/assertJump.js");
const timeTravel = require("./helpers/timeTravel.js");

const TheProjectMock = artifacts.require("../contracts/TheProjectMock.sol");

contract("Basic unit tests", (accounts) => {

    const BN = (n =>  web3.toBigNumber(n))
    const percent = ( (v, p) => Math.floor(v * (p/100)) )
    const DAY = BN("86400");

    const OPEN       = 0  // Open to bets
    const CLOSED     = 1  // Closed to bets, waiting oracle to set the price
    const TARGETSET  = 2  // Oracle set the price, calculating best bet
    const TARGETLOST = 3  // Oracle cannot set the price [end]
    const RESOLVED   = 4  // Bet calculated 
    const PAID       = 5  // Prize paid [end]

    const {
        0: owner,
        1: user1,
        2: user2,
        3: user3,
        4: user4,
        8: platformFeeAddress
    } = accounts;

    const betCycleOffset     = 0;
    const betCycleLength     = 3600;
    const betMinRevealLength = 3600;
    const betMaxRevealLength = 7200;
    const betAmountInDollars = 10000;
    const platformFee        = 10;
    const boatFee            = 20;

    let thepro;

    beforeEach(async () => {

        thepro = await TheProjectMock.new(
            betCycleLength,
            betCycleOffset,
            betMinRevealLength,
            betMaxRevealLength,
            betAmountInDollars,
            platformFee, platformFeeAddress,
            boatFee
        )

        // go forward to the beginning of the cycle
        //   we need that to prevent weird unit test errors
        //   if round changes just in the middle of the test
        const ts =  (await thepro.getNow()).toNumber()
        await timeTravel(betCycleLength - (ts % betCycleLength));

        await thepro.__updateEthPrice(200000)   // 200$/eth
        await thepro.createRoundIfRequiered()

    });

    it("check construction parameters", async () => {
        assert.equal((await thepro.betCycleLength()).toNumber(), betCycleLength);
        assert.equal((await thepro.betCycleOffset()).toNumber(), betCycleOffset);
        assert.equal((await thepro.betMinRevealLength()).toNumber(), betMinRevealLength);
        assert.equal((await thepro.betMaxRevealLength()).toNumber(), betMaxRevealLength);
        assert.equal((await thepro.betAmountInDollars()).toNumber(), betAmountInDollars);
        assert.equal((await thepro.platformFee()).toNumber(), platformFee);
        assert.equal((await thepro.platformFeeAddress()), platformFeeAddress);
        assert.equal((await thepro.boatFee()), boatFee);
     });

    it("a bet is logged", async () => {

        const betValue = await thepro.getBetInEths()
        const roundNo = await thepro.getCurrentRound()

        const trn = await thepro.bet(260000, {from : user1 , value : betValue})
        assert.equal(trn.logs.length, 1);
        assert.equal(trn.logs[ 0 ].event, "LogBet");
        assert.equal(trn.logs[ 0 ].args.round.toNumber(), roundNo);
        assert.equal(trn.logs[ 0 ].args.account, user1);
        assert.equal(trn.logs[ 0 ].args.target.toNumber(), 260000);
        assert.equal(trn.logs[ 0 ].args.amount.toNumber(), betValue.toNumber());
    
    });

    it("target reveal is logged", async () => {

        const betValue = await thepro.getBetInEths()
        const roundNo = await thepro.getCurrentRound()

        await thepro.bet(260000, {from : user1 , value : betValue})

        await timeTravel(betCycleLength+betMinRevealLength+1);
        const trn = await thepro.__updateEthPrice(250000)  //   and set to 250$/h
        assert.equal(trn.logs.length, 1);
        assert.equal(trn.logs[ 0 ].event, "LogTargetSet");
        assert.equal(trn.logs[ 0 ].args.round.toNumber(), roundNo);
        assert.equal(trn.logs[ 0 ].args.target.toNumber(), 250000);

    });

    it("one bet, one win, forcing resolve logs generated", async () => {

        const betValue = await thepro.getBetInEths()
        const roundNo = await thepro.getCurrentRound()

        await thepro.bet(260000, {from : user1 , value : betValue})

        await timeTravel(betCycleLength+betMinRevealLength+1);
        await thepro.__updateEthPrice(250000)  //   and set to 250$/h

        let trn = await thepro.forceResolveRound(roundNo)
        assert.equal(trn.logs.length, 1);
        assert.equal(trn.logs[ 0 ].event, "LogWinner");
        assert.equal(trn.logs[ 0 ].args.round.toNumber(), roundNo);
        assert.equal(trn.logs[ 0 ].args.winner, user1);

        const fees = percent(betValue.toNumber(),platformFee+boatFee)
        const prize = betValue.toNumber() - fees

        const balance = web3.eth.getBalance(user1);
        trn = await thepro.refundPrize(roundNo, { from: user1 } )
        assert.equal(trn.logs.length, 1);
        assert.equal(trn.logs[ 0 ].event, "LogWinnerPaid");
        assert.equal(trn.logs[ 0 ].args.round.toNumber(), roundNo);
        assert.equal(trn.logs[ 0 ].args.winner, user1);
        assert.equal(trn.logs[ 0 ].args.amount.toNumber(), prize);
        assert.equal(trn.logs[ 0 ].args.boat.toNumber(), 0);

        const tx = web3.eth.getTransaction(trn.tx);
        const txPrice = web3.toBigNumber(trn.receipt.gasUsed).mul(tx.gasPrice);
        const expectedBalance = balance.minus(txPrice).plus(prize)
        assert.equal(web3.eth.getBalance(user1).toNumber(), expectedBalance.toNumber());
    });

    it("two bets, one win, forcing resolve", async () => {

        const betValue = await thepro.getBetInEths()
        const roundNo = await thepro.getCurrentRound()

        await thepro.bet(260000, {from : user1 , value : betValue})
        await thepro.bet(245000, {from : user2 , value : betValue})

        await timeTravel(betCycleLength+betMinRevealLength+1);
        await thepro.__updateEthPrice(250000)  //   and set to 250$/h

        const trn = await thepro.forceResolveRound(roundNo)
        assert.equal(trn.logs.length, 1);
        assert.equal(trn.logs[ 0 ].event, "LogWinner");
        assert.equal(trn.logs[ 0 ].args.round.toNumber(), roundNo);
        assert.equal(trn.logs[ 0 ].args.winner, user2);

    });
    
    it("get boat on exact bet matching", async () => {

        let betValue1 = await thepro.getBetInEths()
        let roundNo1 = await thepro.getCurrentRound()

        await thepro.bet(260000, {from : user1 , value : betValue1})
        await timeTravel(betCycleLength+betMinRevealLength+1);
        await thepro.__updateEthPrice(250000)  //   and set to 250$/h
        await thepro.forceResolveRound(roundNo1)
        await thepro.refundPrize(roundNo1, { from: user1 } )

        let boat = percent(betValue1.toNumber(),boatFee)
        assert.equal((await thepro.boat()).toNumber(),boat);

        let betValue2 = await thepro.getBetInEths()
        let roundNo2 = await thepro.getCurrentRound()
        await thepro.bet(270000, {from : user1 , value : betValue2})
        await timeTravel(betCycleLength+betMinRevealLength+1);
        await thepro.__updateEthPrice(270000)  //   and set to 270$/h
        await thepro.forceResolveRound(roundNo2)
        
        const fees = percent(betValue2.toNumber(),platformFee+boatFee)
        const prize = betValue2.toNumber() - fees

        boat = boat + percent(betValue2.toNumber(),boatFee)
        
        const trn = await thepro.refundPrize(roundNo2, { from: user1 } )
        assert.equal(trn.logs.length, 1);
        assert.equal(trn.logs[ 0 ].event, "LogWinnerPaid");
        assert.equal(trn.logs[ 0 ].args.round.toNumber(), roundNo2);
        assert.equal(trn.logs[ 0 ].args.winner, user1);
        assert.equal(trn.logs[ 0 ].args.amount.toNumber(), prize);
        assert.equal(trn.logs[ 0 ].args.boat.toNumber(), boat);

        assert.equal((await thepro.boat()).toNumber(),0);
    });

    it("check getRoundStatus results", async () => {

        const betValue = await thepro.getBetInEths()
        const roundNo = await thepro.getCurrentRound()

        assert.equal((await thepro.getRoundStatus(roundNo)).toNumber(), OPEN);

        await thepro.bet(260000, {from : user1 , value : betValue})

        assert.isTrue((await thepro.remainingRoundTime()).toNumber() > 0)      
        await timeTravel(betCycleLength+1); // Wait next round
        assert.isTrue((await thepro.remainingRoundTime()).toNumber() == 0)  

        assert.equal((await thepro.getRoundStatus(roundNo)).toNumber(), CLOSED);

        assert.isTrue((await thepro.remainingRevealTime(roundNo)).toNumber() > 0)
        await timeTravel(betMinRevealLength);
        assert.isTrue((await thepro.remainingRevealTime(roundNo)).toNumber() == 0)

        await thepro.__updateEthPrice(250000)  //   and set to 250$/h

        assert.equal((await thepro.getRoundStatus(roundNo)).toNumber(), TARGETSET);
        await thepro.forceResolveRound(roundNo)
 
        assert.equal((await thepro.getRoundStatus(roundNo)).toNumber(), RESOLVED);

        trn = await thepro.refundPrize(roundNo, { from: user1 } )

        assert.equal((await thepro.getRoundStatus(roundNo)).toNumber(), PAID);

    });



    it("two bets in two rounds should autoresolve", async () => {
        
        const betValue = await thepro.getBetInEths()
        const roundNo1 = await thepro.getCurrentRound()

        await thepro.bet(260000, {from : user1 , value : betValue})
        await thepro.bet(245000, {from : user2 , value : betValue})

        await timeTravel(betCycleLength+betMinRevealLength+1);
        await thepro.__updateEthPrice(250000)  //   and set to 250$/h

        const roundNo2 = await thepro.getCurrentRound()

        await thepro.bet(260000, {from : user1 , value : betValue})
        const trn = await thepro.bet(245000, {from : user2 , value : betValue})
        assert.equal(trn.logs.length, 2);
        assert.equal(trn.logs[ 1 ].event, "LogWinner");
        assert.equal(trn.logs[ 1 ].args.round.toNumber(), roundNo1);
        assert.equal(trn.logs[ 1 ].args.winner, user2);
    });

    it("updateprice before resolution date does not work", async () => {
        const betValue = await thepro.getBetInEths()
        const roundNo = await thepro.getCurrentRound()

        await thepro.bet(260000, {from : user1 , value : betValue})

        await timeTravel(betCycleLength+betMinRevealLength-60); 
        await thepro.__updateEthPrice(250000)  // and set to 250$/h

        assert.equal((await thepro.getRoundStatus(roundNo)).toNumber(), CLOSED);
    });

    it("two bets cannot have the same amount", async () => {
        
        const betValue = await thepro.getBetInEths()
        const roundNo = await thepro.getCurrentRound()

        await thepro.bet(260000, {from : user1 , value : betValue})
        try {
            await thepro.bet(260000, {from : user2 , value : betValue})   
        } catch (error) {
            return assertJump(error);
        }
        assert.fail("should have thrown before");
    
    });

    it("cannot diposit less ether", async () => {
        
        const betValue = await thepro.getBetInEths()
        const roundNo = await thepro.getCurrentRound()

        try {
            await thepro.bet(260000, {from : user1 , value : betValue.minus(1)})
        } catch (error) {
            return assertJump(error);
        }
        assert.fail("should have thrown before");
    
    });

    it("if more ether is sent, excess is refunded", async () => {
        
        const betValue = await thepro.getBetInEths()
        const roundNo = await thepro.getCurrentRound()

        const balance = web3.eth.getBalance(user1);

        const trn = await thepro.bet(260000, {from : user1 , value : betValue.plus(1)})
        const tx = web3.eth.getTransaction(trn.tx);
        const txPrice = web3.toBigNumber(trn.receipt.gasUsed).mul(tx.gasPrice);

        const expectedBalance = balance.minus(betValue).minus(txPrice)
        assert.equal(web3.eth.getBalance(user1).toNumber(), expectedBalance.toNumber());
    
    });

    it("fail to refund when all is ok ", async () => {
        
        const betValue = await thepro.getBetInEths()
        const roundNo = await thepro.getCurrentRound()

        await thepro.bet(260000, {from : user1 , value : betValue})
        let trn = await thepro.refundBadRound(roundNo, {from : user1 })
        assert.equal(trn.logs.length, 0);

        await timeTravel(betCycleLength+betMinRevealLength);

        trn = await thepro.refundBadRound(roundNo, {from : user1 })
        assert.equal(trn.logs.length, 0);

        await thepro.__updateEthPrice(250000)  //   and set to 250$/h
        await thepro.forceResolveRound(roundNo)

        trn = await thepro.refundBadRound(roundNo, {from : user1 })
        assert.equal(trn.logs.length, 0);

    });

    it("success to refund when round cannot be resolved", async () => {
        
        const betValue = await thepro.getBetInEths()
        const roundNo = await thepro.getCurrentRound()

        await thepro.bet(260000, {from : user1 , value : betValue})
        await thepro.bet(260001, {from : user1 , value : betValue})
        await thepro.bet(260002, {from : user2 , value : betValue})

        let trn = await thepro.refundBadRound(roundNo, {from : user1 })
        assert.equal(trn.logs.length, 0);

        await timeTravel(betCycleLength+betMaxRevealLength+1);
        assert.equal((await thepro.getRoundStatus(roundNo)).toNumber(), TARGETLOST);

        trn = await thepro.refundBadRound(roundNo, {from : user1 })
        assert.equal(trn.logs.length, 1);
        assert.equal(trn.logs[ 0 ].event, "LogRefund");
        assert.equal(trn.logs[ 0 ].args.round.toNumber(), roundNo);
        assert.equal(trn.logs[ 0 ].args.account, user1);
        assert.equal(trn.logs[ 0 ].args.amount.toNumber(), betValue.mul(2).toNumber());

    });

});

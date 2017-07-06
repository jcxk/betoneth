// This test suite corresponds to the old Vault test suite

/* global artifacts */
/* global contract */
/* global web3 */
/* global assert */

const assertJump = require("./helpers/assertJump.js");
const timeTravel = require("./helpers/timeTravel.js");

const TheProjectMock = artifacts.require("../contracts/TheProjectMock.sol");

contract("first test", (accounts) => {

    const WEI = web3.toBigNumber("1");
    const FIFTY_WEI = web3.toBigNumber("50");

    const OPEN       = 0  // Open to bets
    const CLOSED     = 1  // Closed to bets, waiting oracle to set the price
    const TARGETSET  = 2  // Oracle set the price, calculating best bet
    const TARGETLOST = 3  // Oracle cannot set the price [end]
    const RESOLVED   = 4  // Bet calculated & paid [end]

    const {
        0: owner,
        1: user1,
        2: user2,
        3: user3,
        4: user4,
    } = accounts;

    let thepro;

    beforeEach(async () => {
        thepro = await TheProjectMock.new()
        await thepro.__updateEthPrice(200000)   // 200$/eth
        await thepro.createRoundIfRequiered()
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

    it("two bets, one win, forcing resolve", async () => {
        
        const betValue = await thepro.getBetInEths()
        const roundNo = await thepro.getCurrentRound()

        assert.equal((await thepro.getRoundStatus(roundNo)).toNumber(), OPEN);

        await thepro.bet(260000, {from : user1 , value : betValue})
        await thepro.bet(245000, {from : user2 , value : betValue})

        assert.isTrue((await thepro.remainingRoundTime()).toNumber() > 0)      
        await timeTravel((86400)+1); // Wait 1 day
        assert.isTrue((await thepro.remainingRoundTime()).toNumber() == 0)  

        assert.equal((await thepro.getRoundStatus(roundNo)).toNumber(), CLOSED);

        assert.isTrue((await thepro.remainingRevealTime(roundNo)).toNumber() > 0)
        await timeTravel(86400*14); // Wait 14 days
        assert.isTrue((await thepro.remainingRevealTime(roundNo)).toNumber() == 0)

        await thepro.__updateEthPrice(250000)  //   and set to 250$/h

        assert.equal((await thepro.getRoundStatus(roundNo)).toNumber(), TARGETSET);
        const trn = await thepro.forceResolveRound(roundNo)
        assert.equal(trn.logs.length, 1);
        assert.equal(trn.logs[ 0 ].event, "LogPrize");
        assert.equal(trn.logs[ 0 ].args.round.toNumber(), roundNo);
        assert.equal(trn.logs[ 0 ].args.winner, user2);
        assert.equal(trn.logs[ 0 ].args.amount.toNumber(), betValue.mul(2).toNumber());

        assert.equal((await thepro.getRoundStatus(roundNo)).toNumber(), RESOLVED);

    });

    it("two bets in two rounds should autoresolve", async () => {
        
        const betValue = await thepro.getBetInEths()
        const roundNo1 = await thepro.getCurrentRound()

        await thepro.bet(260000, {from : user1 , value : betValue})
        await thepro.bet(245000, {from : user2 , value : betValue})

        await timeTravel(86400*15+1); // Wait 15 days
        await thepro.__updateEthPrice(250000)  //   and set to 250$/h

        const roundNo2 = await thepro.getCurrentRound()

        await thepro.bet(260000, {from : user1 , value : betValue})
        const trn = await thepro.bet(245000, {from : user2 , value : betValue})
        assert.equal(trn.logs.length, 2);
        assert.equal(trn.logs[ 1 ].event, "LogPrize");
        assert.equal(trn.logs[ 1 ].args.round.toNumber(), roundNo1);
        assert.equal(trn.logs[ 1 ].args.winner, user2);
        assert.equal(trn.logs[ 1 ].args.amount.toNumber(), betValue.mul(2).toNumber());
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

});


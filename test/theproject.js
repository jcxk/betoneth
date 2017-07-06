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

    it("user1 bets 250, user2 bets 245, user2 wins", async () => {
        
        const betValue = await thepro.getBetInEths()
        const roundNo = await thepro.getRoundCount() - 1

        assert.equal((await thepro.getRoundStatus(roundNo)).toNumber(), OPEN);

        await thepro.bet(260000, {from : user1 , value : betValue})
        await thepro.bet(245000, {from : user2 , value : betValue})

        assert.isTrue((await thepro.remainingLastRoundTime()).toNumber() > 0)      
        await timeTravel((86400)+1); // Wait 1 day
        assert.isTrue((await thepro.remainingLastRoundTime()).toNumber() == 0)  

        assert.equal((await thepro.getRoundStatus(roundNo)).toNumber(), CLOSED);

        assert.isTrue((await thepro.remainingRevealTime(roundNo)).toNumber() > 0)
        await timeTravel(86400*14); // Wait 14 days
        assert.isTrue((await thepro.remainingRevealTime(roundNo)).toNumber() == 0)

        await thepro.__updateEthPrice(250000)  //   and set to 250$/h

        assert.equal((await thepro.getRoundStatus(roundNo)).toNumber(), TARGETSET);
        const tx = await thepro.forceResolveRound(roundNo)
        assert.equal(tx.logs.length, 1);
        assert.equal(tx.logs[ 0 ].event, "LogPrize");
        assert.equal(tx.logs[ 0 ].args.round.toNumber(), roundNo);
        assert.equal(tx.logs[ 0 ].args.winner, user2);
        assert.equal(tx.logs[ 0 ].args.amount.toNumber(), betValue.mul(2).toNumber());

        assert.equal((await thepro.getRoundStatus(roundNo)).toNumber(), RESOLVED);

    });

});

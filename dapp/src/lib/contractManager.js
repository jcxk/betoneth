import BaseContractManager from './baseContractManager';

let contractConfig = [
  'betCycleLength',
  'betCycleOffset',
  'betMinRevealLength',
  'betMaxRevealLength',
  'betAmount',
  'platformFee',
  'boatFee',
  'lastRevealedRound',
  'boat',
  'priceUpdater'
];

const FUTURE = 0;  // Not exists yet
const OPEN = 1;  // Open to bets
const CLOSED = 2;  // Closed to bets, waiting oracle to set the price
const PRICEWAIT = 3;  // Waiting set the price
const PRICESET = 4;  // Oracle set the price, calculating best bet
const PRICELOST = 5;  // Oracle cannot set the price [end]
const RESOLVED = 6;  // Bet calculated
const FINISHED = 7;  // Prize paid [end]

const mainNetAddress = '0x7B77eBD4760D80A12586097ec1527ff8367a067f';

const statuses = [
  'FUTURE',
  'OPEN',
  'CLOSED',
  'PRICEWAIT',
  'PRICESET',
  'PRICELOST',
  'RESOLVED',
  'FINISHED'
]
const contractBasePath = '../../../build/contracts/';

class contractManager extends BaseContractManager {

  constructor (web3, opts = {}) {
    let contractName = 'Bettingon';
    if (opts.env === 'development') {
       //contractName += 'UITestDeploy';
      opts['json'] = require("../../../build/contracts/"+contractName+".json");
    } else {
      opts['address'] = mainNetAddress;
    }
    opts['config'] = contractConfig;
    super(web3, opts);
    this.account="";
  }

  getStatus (statusId) {
    return statuses[statusId];
  }


  async getRoundCount(fromDate) {
    let parsedDate = this.web3.toBigNumber(
      Math.floor(fromDate / 1000)
    );

    return this.contract.getRoundCount(parsedDate).then(
      function (roundCount) {
        return roundCount.toNumber();
      });
  }

  async getRounds(lastRound, roundStart = 0) {
    let rounds = [];
    let roundNo = roundStart;
    for (roundNo; roundNo < lastRound; roundNo++) {
      rounds.push(
        await this.getRoundFullInfo(roundNo, Date.now())
      )
    }
    //console.log(lastRound, roundStart);
    //return _.keyBy(rounds, 'roundId');
    //console.log(rounds);
    return rounds;
  }

  async getBetsRound(roundId, betCount) {
    let betNo = 0;
    let betsPromises = [];
    for (betNo; betNo < betCount; betNo++) {
      betsPromises.push(this.contractCall('getBetAt', [roundId, betNo]));
    }
    return Promise.all(betsPromises).then((bets) => {
      return _.values(bets);
    });
  }

  async getRoundInfo(roundNo, now) {
    return await this.contractCall("getRoundAt", [roundNo, now]);
  }

  async getRoundFullInfo(roundNo, now) {
    let round = await this.getRoundInfo(roundNo, now);
    console.log(round);
    let bets = await this.getBetsRound(roundNo, round.betCount);
    let response = round;
    response['bets'] = bets;
    return response;
  }


  async getCurrentRoundId() {
    let roundArr = await this.contract.getRoundById(0,this.getNow());
    return (roundArr.length > 0) ? roundArr[0] : false;
  }



  async uiBid (targetStr) {
    let currentRoundId = await this.getCurrentRoundId();
    let targets=targetStr.split(",").map(function(x){return Math.round(parseFloat(x)*1000)})

    let opts = { ...this.getOptions(), value: this.config.betAmount.mul(targets.length) }
    console.log(opts);
    return await this.doTransaction(
          this.contract.bet(
            currentRoundId,
            targets,
            opts
            )
        );

  }




  async setPrice (price) {
    console.log(price);
    return await this.doTransaction(
      this.contract.updateEthPrice(price,this.getOptions())
    );

  }

  async forceResolve (roundId) {

    return await this.doTransaction(
       this.contract.resolve(roundId,999,this.getOptions())
    );

  }

  async withdraw (roundId) {

    return await this.doTransaction(
      this.contract.withdraw(roundId,this.getOptions())
    );

  }

  timediff2str(diff) {

    const d = diff / (24*3600) ; diff = diff%(24*3600)
    const h = diff / (3600) ; diff = diff % 3600
    const m = diff / (60)
    const s = diff % 60
    const pad = function (v) {
      v = Math.floor(v);
      if (v>9) return ""+v;
      return "0"+v;
    }

    if (d>0) {
      return pad(d)+"d"+pad(h)+"h"+pad(m)+"m";
    } else {
      return pad(h)+"h"+pad(m)+"m";
    }
  }

}

export default contractManager;


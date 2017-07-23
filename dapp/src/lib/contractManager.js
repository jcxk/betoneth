import {default as contract} from 'truffle-contract';
import bettingon_artifacts from '../../../build/contracts/BettingonDeploy.json';
import * as _ from 'lodash';
import moment from 'moment';

let contractConfig = [
  'betCycleLength',
  'betCycleOffset',
  'betMinRevealLength',
  'betMaxRevealLength',
  'betAmount',
  'platformFee',
  'boatFee',
  'lastRevealedRound',
  'resolvingRound',
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

class contractManager {

  constructor (web3, env) {
    console.log(web3.currentProvider);
    this.web3 = web3;
    let Bettingon = contract(bettingon_artifacts);
    Bettingon.setProvider(web3.currentProvider);
    this.contractPromise = (env === 'production') ?
      Promise.resolve(Bettingon.at(mainNetAddress)) : Bettingon.deployed();
  }

  getStatus (statusId) {
    return statuses[statusId];
  }

  async init () {
    this.contract = await this.getContract();
    this.abiNames = _.map(this.contract.abi, 'name');
    let configVarsPromises = contractConfig.map((item) => {
      return this.contract[item]()
    });
    this.config = await Promise.all(configVarsPromises).then((_values) => {
      return Object.assign({},
        ...contractConfig.map(
          (contractConstant, index) => (
            {[contractConstant]: _values[index]}
          )
        )
      );
    });


  }



  toEth(value) {
    return this.web3.toBigNumber(value).div(web3.toWei(1, 'finney')) / 1000
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

  async getContract() {
    return this.contractPromise.then(function (contractObj) {
      return contractObj;
    });
  }

  getMethodReturnFromAbi(method) {
    let methodIndex = _.indexOf(this.abiNames, method);
    return _.map(this.contract.abi[methodIndex].outputs, 'name');
  }

  async contractCall(method, params) {
    let methodPromise = '';
    switch (method) {
      case "getBetAt":
      case "getRoundAt":
        methodPromise = this.contract[method](params[0], params[1]);
        break;

      default:
        return false;
    }

    return methodPromise.then(
      (_values) => {
        let response = {};
        _.map(
          this.getMethodReturnFromAbi(method),
          (responseProperty, index) => {
            response[responseProperty] = typeof(_values[index]) == 'string' ? _values[index] : _values[index].toNumber();
            //this.web3.is_big_number(_values[index]) ? _values[index].toNumber() : _values[index]
          });
        return response;
      }
    );
  }


  async getRounds(lastRound, roundStart = 0) {
    let rounds = [];
    let roundNo = roundStart;
    for (roundNo; roundNo < lastRound; roundNo++) {
      rounds.push(
        await this.getRoundFullInfo(roundNo, Date.now())
      )
    }
    console.log(lastRound, roundStart);
    //return _.keyBy(rounds, 'roundId');
    console.log(rounds);
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
    return this.contractCall("getRoundAt", [roundNo, now]);
  }

  async getRoundFullInfo(roundNo, now) {
    let round = await this.getRoundInfo(roundNo, now);
    let bets = await this.getBetsRound(roundNo, round.betCount);
    let response = round;
    response['bets'] = bets;
    return response;
  }

  async uiBid (targetValue) {

    const now = Math.floor(Date.now() / 1000);
    return await this.contract.getRoundById(0,this.web3.toBigNumber(now))
      .then( (_values) => {
        let target=Math.round(parseFloat(targetValue)*1000);
        return this.dotransaction(
          this.contract.bet(
            _values[0],
            target,
            { from: this.account, value: this.config.betAmount.toNumber(), gas: 500000 }
            )
        );
      })

  }

  async setPrice (price) {
    console.log(price);
    return await this.dotransaction(
      this.contract.updateEthPrice(price,{from: this.account})
    );

  }

  async forceResolve (roundId) {
    return this.dotransaction(
       this.contract.forceResolveRound(roundId,{from: this.account})
    );

  }

  async refund (roundId) {

    return this.dotransaction(
      this.contract.refund(roundId,{from: this.account})
    );

  }

  async dotransaction (_promise) {

    return await _promise
      .then ( (_tx) => {
        console.log("tx "+_tx.tx);
        return this.getTransactionReceiptMined(_tx.tx);
      }).then ( ( _resolve, _reject ) => {
      console.log('transaction success');
      return true;
    }).catch ( (e) => {
      console.log(e, 'transaction failed');
      return false;
    })

  }

  getTransactionReceiptMined (txnHash, interval) {
    var self = this;

    var transactionReceiptAsync;
    interval = interval ? interval : 500;
    transactionReceiptAsync = (txnHash, resolve, reject) => {
      try {
        this.web3.eth.getTransactionReceipt(txnHash, (_,receipt) => {
          if (receipt == null || receipt.blockNumber == null ) {
            setTimeout(function () {
              transactionReceiptAsync(txnHash, resolve, reject);
            }, interval);
          } else {
            console.log(receipt);
            resolve(receipt);
          }
        });
      } catch(e) {
        reject(e);
      }
    };

    if (Array.isArray(txnHash)) {
      var promises = [];
      txnHash.forEach(function (oneTxHash) {
        promises.push(self.getTransactionReceiptMined(oneTxHash, interval));
      });
      return Promise.all(promises);
    } else {
      return new Promise(function (resolve, reject) {
        transactionReceiptAsync(txnHash, resolve, reject);
      });
    }
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


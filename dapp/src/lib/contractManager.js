import { default as contract } from 'truffle-contract'

import bettingon_artifacts from '../../../build/contracts/BettingonDeploy.json';
import * as _ from 'lodash';

let contractConfig = [
  'betCycleLength',
  'betCycleOffset',
  'betMinRevealLength',
  'betMaxRevealLength',
  'betAmount',
  'platformFee',
  'boatFee'
];

const FUTURE     = 0  // Not exists yet
const OPEN       = 1  // Open to bets
const CLOSED     = 2  // Closed to bets, waiting oracle to set the price
const PRICEWAIT  = 3  // Waiting set the price
const PRICESET   = 4  // Oracle set the price, calculating best bet
const PRICELOST  = 5  // Oracle cannot set the price [end]
const RESOLVED   = 6  // Bet calculated
const FINISHED   = 7  // Prize paid [end]

class contractManager {
   constructor (web3, env) {
    console.log(web3.currentProvider);
    this.web3= web3;
    let Bettingon = contract(bettingon_artifacts);
    Bettingon.setProvider(web3.currentProvider);
    env = 'production';
    if (env == 'production') {
          Bettingon.at("0x7B77eBD4760D80A12586097ec1527ff8367a067f");
        }
    this.contract = (env == 'production') ?  new Promise(function (resolve, reject) {resolve(Bettingon);}) : Bettingon.deployed();

  }

 getNetwork() {
     return this.web3.version.getNetwork((err, netId) => ( console.log(netId)));
 }

  async getConfig() {
      return await this.contract.then(function (betContract) {
        let infoPromises = []
        contractConfig.map(function (item) {
          infoPromises.push(
            betContract[item]()
          )
        })
        return Promise.all(infoPromises);
      }).then(function (_values) {
        return Object.assign({},
          ...contractConfig.map(
            (contractConstant, index) => (
            {[contractConstant]:  _values[index].toNumber() }
            )
          )
        );
      });
  }

}

export default contractManager


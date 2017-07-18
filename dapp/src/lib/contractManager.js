import {default as contract} from 'truffle-contract'

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
    "lastRevealedRound",
    "resolvingRound",
    "boat",
    "priceUpdater"
];

const FUTURE = 0  // Not exists yet
const OPEN = 1  // Open to bets
const CLOSED = 2  // Closed to bets, waiting oracle to set the price
const PRICEWAIT = 3  // Waiting set the price
const PRICESET = 4  // Oracle set the price, calculating best bet
const PRICELOST = 5  // Oracle cannot set the price [end]
const RESOLVED = 6  // Bet calculated
const FINISHED = 7  // Prize paid [end]

const mainNetAddress = "0x7B77eBD4760D80A12586097ec1527ff8367a067f";

class contractManager {



    constructor(web3, env) {
        console.log(web3.currentProvider);
        this.web3 = web3;
        let Bettingon = contract(bettingon_artifacts);
        Bettingon.setProvider(web3.currentProvider);
        this.contract = (env == 'production') ?
            Promise.resolve( Bettingon.at(mainNetAddress)) : Bettingon.deployed();
    }

    async getConfig() {
        return await this.contract.then((betContract) => {
            let infoPromises = [];
            contractConfig.map(function (item) {
                infoPromises.push(
                    betContract[item]()
                )
            });
            return Promise.all(infoPromises);
        }).then((_values) => {

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
        return this.web3.toBigNumber(value).div(web3.toWei(1,'finney'))/1000
    }



}

export default contractManager


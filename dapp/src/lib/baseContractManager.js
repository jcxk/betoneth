import {default as contract} from 'truffle-contract';
import * as _ from 'lodash';

class BaseContractManager {

  constructor (web3, opts) {
    console.log(opts,'opts');
    this.configVars = opts.config;
    this.web3 = web3;
    this.account = opts.account;
    this.env = opts.env;
    let contractObj = contract(opts.json);
    contractObj.setProvider(web3.currentProvider);
    this.contractPromise = (opts.env === 'production') ?
      Promise.resolve(contractObj.at(opts.address)) : contractObj.deployed();
    this.init();
  }

  static async getContractByPathAndAddr(contractName, provider, addr = false) {
    let c = contract(
      require("../../../build/contracts/" + contractName + ".json")
    );
    let address = "";
    c.setProvider(provider);
    let r = "", rs = "", t= "";
    if (addr != false) {
        t ="asd";

    } else {
      r = await c.deployed().then( (c) => c.bon());
      t = r;

    }
    return t;
  }

  getOptions() {

    let opts = { from: this.account };
    if (this.env == 'development') {
      opts['gas'] = 500000;
    }
    return opts;
  }

  async init () {
    this.contract = await this.contractPromise.then(
      (contractObj) =>
      {
        let bettingonAddr = contractObj.bon();
        return

      }
    );
    this.abiNames = _.map(this.contract.abi, 'name');
    let configVarsPromises = this.configVars.map((item) => {
      try {
      return this.contract[item]()
      } catch(e) {
        console.log(item, 'getter error');
      }
    });


    this.config = await Promise.all(configVarsPromises).then((_values) => {
      return Object.assign({},
        ...this.configVars.map(
          (contractConstant, index) => (
            {[contractConstant]: _values[index]}
          )
        )
      );
    });
    this.config['address'] = this.contract.address;

  }



  toEth(value) {
    return this.web3.toBigNumber(value).div(web3.toWei(1, 'finney')) / 1000
  }



  getMethodReturnFromAbi(method) {
    let methodIndex = _.indexOf(this.abiNames, method);
    return _.map(this.contract.abi[methodIndex].outputs, 'name');
  }

  contractResponseMap(response, method) {
    let responseMapped={};
    let retProps = this.getMethodReturnFromAbi(method);
      _.map(
      retProps,
      (responseProperty, index) => {
        responseMapped[responseProperty] = typeof(response[index]) == 'string' ?
          response[index] : response[index].toNumber();
        //this.web3.is_big_number(_values[index]) ? _values[index].toNumber() : _values[index]
      });
      return responseMapped;
  }

  async contractCall(method, params) {
   // params.push(this.getOptions());
    return await this.contract[method].call(...params).then(
      response => {
        return this.contractResponseMap(response,method)
      }
    );
  }




  getNow() {
    return this.web3.toBigNumber(
      Math.floor(Date.now() / 1000)
    );
  }


  watchEvents() {
    this.contract.allEvents({fromBlock: 0, toBlock: 'latest'}).watch( (error, result) => {
       console.log(error != undefined ? error: { event: result.event, args: result.args } ,'event');
    });
  }

  getTransactionReceiptMined(txnHash, interval = 500) {

    let transactionReceiptAsync = (txnHash, resolve, reject) => {
      try {
        this.web3.eth.getTransactionReceipt(txnHash,
          (_,receipt) => {
          if (receipt == null || receipt.blockNumber == null ) {
            setTimeout(function () {
              transactionReceiptAsync(txnHash, resolve, reject);
            }, interval);
          } else {
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
        console.log(oneTxHash,'hash');
        promises.push(this.getTransactionReceiptMined(oneTxHash, interval));
      });
      return Promise.all(promises);
    } else {
      return new Promise(function (resolve, reject) {
        transactionReceiptAsync(txnHash, resolve, reject);
      });
    }
  }


  async doTransaction(_promise) {
    return _promise.then(
      (_tx) => this.getTransactionReceiptMined(_tx.tx)
    );
  }

}

export default BaseContractManager;


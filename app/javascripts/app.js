// Import the page's CSS. Webpack will know what to do with it.
import "../stylesheets/app.css";

// Import libraries we need.
import { default as Web3} from 'web3';
import { default as contract } from 'truffle-contract'

// Import our contract artifacts and turn them into usable abstractions.
import bettingon_artifacts from '../../build/contracts/BettingonMock.json'

var BettingonMock = contract(bettingon_artifacts);

const FUTURE     = 0  // Not exists yet
const OPEN       = 1  // Open to bets
const CLOSED     = 2  // Closed to bets, waiting oracle to set the price
const TARGETWAIT = 3  // Waiting set the price
const TARGETSET  = 4  // Oracle set the price, calculating best bet
const TARGETLOST = 5  // Oracle cannot set the price [end]
const RESOLVED   = 6  // Bet calculated 
const FINISHED   = 7  // Prize paid [end]

var accounts;
var account;
var bon;
var betCycleLength;      
var betCycleOffset;      
var betMinRevealLength;
var betMaxRevealLength;
var betAmountInDollars;
var platformFee;
var boatFee;

window.App = {

  start: function() {
    var self = this;

    // Bootstrap the MetaCoin abstraction for Use.
    BettingonMock.setProvider(web3.currentProvider);

    // Get the initial account balance so it can be displayed.
    web3.eth.getAccounts(function(err, accs) {
      if (err != null) {
        alert("There was an error fetching your accounts.");
        return;
      }

      if (accs.length == 0) {
        alert("Couldn't get any accounts! Make sure your Ethereum client is configured correctly.");
        return;
      }

      accounts = accs;
      account = accounts[0];

      BettingonMock.deployed()
      .then(function(_bon) {
        bon = _bon;
        console.log("bon=",bon.address)
        return Promise.all([
            bon.betCycleLength(),
            bon.betCycleOffset(),
            bon.betMinRevealLength(),
            bon.betMaxRevealLength(),
            bon.betAmountInDollars(),
            bon.platformFee(),
            bon.boatFee(),
            bon.lastRevealedRound(),
            bon.resolvingRound(),
            bon.milliDollarsPerEth(),
            bon.boat(),
            bon.getNow()
         ])
      })
      .then(function (_values) {

        let now = Math.floor(Date.now() / 1000);

        betCycleLength = _values[0].toNumber();
        betCycleOffset = _values[1].toNumber();
        betMinRevealLength = _values[2].toNumber();
        betMaxRevealLength = _values[3].toNumber();
        betAmountInDollars = _values[4].toNumber();
        platformFee = _values[5].toNumber();
        boatFee = _values[6].toNumber();

        let paramInfo = "";

        paramInfo+="betCycleLength="+betCycleLength;
        paramInfo+=", betCycleOffset="+betCycleOffset;
        paramInfo+="\nbetMinRevealLength="+betMinRevealLength;
        paramInfo+=", betMaxRevealLength="+betMaxRevealLength;
        paramInfo+="\nbetAmountInDollars="+betAmountInDollars;
        paramInfo+="\nplatformFee="+platformFee;
        paramInfo+=", boatFee="+boatFee;
        paramInfo+="\nlastRevealedRound="+_values[7].toNumber();
        paramInfo+=", resolvingRound="+_values[8].toNumber();
        paramInfo+="\nmilliDollarsPerEth="+_values[9].toNumber();
        paramInfo+="\nboat="+_values[10].toNumber();
        paramInfo+="\nnowhost, nowevm:"+now+","+_values[11].toNumber();

        document.getElementById("paramInfo").innerHTML = "<pre>"+paramInfo+"</pre>"

        self.refresh();
      })
    })
  },

  getTransactionReceiptMined : function (txnHash, interval) {
      var self = this;

      var transactionReceiptAsync;
      interval = interval ? interval : 500;
      transactionReceiptAsync = function(txnHash, resolve, reject) {
          try {
              web3.eth.getTransactionReceipt(txnHash, (_,receipt) => {
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
  },

  setStatus: function(message,working) {
    var status = document.getElementById("status");
    if (working) message+="<img src='http://keegansirishpub.net/wp-content/themes/octane-bootstrap/images/loader.gif'>"
    status.innerHTML = message;
  },

  timediff2str : function(diff) {
     const d = diff / (24*3600) ; diff = diff%(24*3600)
     const h = diff / (3600) ; diff = diff % 3600
     const m = diff / (60)
     const s = diff % 60
     const pad = function (v) {
        v = Math.floor(v);
        if (v>9) return ""+v;
        return "0"+v;
     }
     return pad(d)+"d"+pad(h)+"h"+pad(m)+"m"+pad(s)+"s"
  },

  roundFullInfo : function (roundNo,now) {
    var self = this;

    let info;

    return bon.getRoundAt(roundNo, web3.toBigNumber(now))
    .then(function(_values) {
      info = self.roundInfoFromValues(roundNo,_values,now);
      let bets = []
      for (let betNo = 0; betNo < _values[3].toNumber(); betNo++) { 
        bets.push(bon.getBetAt(roundNo,betNo));
      } 
      return Promise.all(bets)
    }).then(function(_bets) {
      for (let betNo = 0; betNo < _bets.length; betNo++) { 
        info += "\n >" + _bets[betNo][0] +" "+_bets[betNo][1].toNumber()
      } 
      info+="\n\n"
      return new Promise(function (resolve, reject) {
        resolve(info);
      });
    })

  },

  roundInfoFromValues : function(roundNo, values, now) {
      var self = this;

      const statuses = [
        "FUTURE    ",
        "OPEN      ",
        "CLOSED    ",
        "TARGETWAIT",
        "TARGETSET ",
        "TARGETLOST",
        "RESOLVED  ",
        "FINISHED      "
      ]

      let [
        status,
        closeDate,
        betAmount,
        betCount,
        target,
        lastCheckedBetNo,
        closestBetNo
      ] = [ 
        values[0].toNumber(),
        values[1].toNumber(),
        values[2].toNumber(),
        values[3].toNumber(),
        values[4].toNumber(),
        values[5].toNumber(),
        values[6].toNumber()
      ];

      let info ="ROUND "+roundNo
      info += " "+statuses[status];
      info += " "+betCount+" bets ";

      switch (status) {
        case FUTURE :
        case OPEN :
          info += " - "+self.timediff2str(closeDate-now)+" to close."
          break;
        case CLOSED :
           info += " - "+self.timediff2str(closeDate+betMinRevealLength-now)+" to start set target."
           break;
        case TARGETWAIT :
           info += " - "+self.timediff2str(closeDate+betMaxRevealLength-now)+" to finish set target."
           break;
        case TARGETSET :
           info += " - target="+target+" "+lastCheckedBetNo+"/"+betCount+" resolved."
           break;
        case TARGETLOST :
           break;
        case RESOLVED :
           info += " - target="+target+" winner is "+closestBetNo
           break;
        case FINISHED :
           info += " - target="+target+" winner is "+closestBetNo
           break;
      }
      return info;    
  },

  refresh: function() {
    var self = this;
    
    const now = Math.floor(Date.now() / 1000);

    var roundNo;
    
    return bon.getRoundCount(web3.toBigNumber(now))
    .then(function(_roundCount) {
      let roundCount = _roundCount.toNumber();
      let promises = []
      for (let roundNo = roundCount - 1; roundNo >=0 ; roundNo--) { 
        promises.push(self.roundFullInfo(roundNo,now));
      } 
      return Promise.all(promises)
    })
    .then(function(_infos) {
      let info=""
      for (let roundNo = 0; roundNo < _infos.length; roundNo++) { 
        info+=_infos[roundNo]
      } 
      document.getElementById("info").innerHTML = "<pre>"+info+"</pre>";
    })
    .catch(function(e) {
      alert("failed")
      console.log(e);
    });
  },

  dotransaction : function (_promise) {

    var self = this;

    self.setStatus("Waiting network agrees with operation...",true);
    _promise
    .then ( (_tx) => {
      //toastr.info('Operation sent');
      console.log("tx "+_tx.tx);
      return self.getTransactionReceiptMined(_tx.tx);     
    }).then ( ( _resolve, _reject ) => {
      self.setStatus("Success",false);
      //toastr.info('Success');
      self.refresh();
    }).catch ( (e) => {
      //toastr.error('Failed, see logs')
      console.log(e);
      self.setStatus("Failed",false);
    })

  },

  uiBid : function() {

    var self = this;

    const now = Math.floor(Date.now() / 1000);

    bon.getCurrentRound(web3.toBigNumber(now))
    .then(function(_roundNo) {
      return bon.getRoundAt(_roundNo,web3.toBigNumber(now))
    })
    .then(function(_values) {
      let betValue = _values[2].toNumber();
      let target = prompt("Your bid? (must diposit "+betValue+")")
      if (target === null) {
        return; 
      }
      self.dotransaction(
        bon.bet(target,"",{from: account, value: _values[2] })
      );
    })

  },

  uiSetPrice : function() {

    var self = this;

    let target = prompt("Set target to:")
    if (target === null) {
      return; 
    }
    self.dotransaction(
      bon.__updateEthPrice(target,"",{from: account})
    );

  },

  uiForceResolve : function() {

    var self = this;

    let roundNo = prompt("Round to force resolve:")
    if (roundNo === null) {
      return; 
    }
    self.dotransaction(
      bon.forceResolveRound(roundNo,{from: account})
    );

  },

  uiRefund : function() {

    var self = this;

    let roundNo = prompt("Round to refund:")
    if (roundNo === null) {
      return; 
    }
    self.dotransaction(
      bon.refund(roundNo,{from: account})
    );

  }




};

window.addEventListener('load', function() {
  // Checking if Web3 has been injected by the browser (Mist/MetaMask)
  if (typeof web3 !== 'undefined') {
    console.warn("Using web3 detected from external source. If you find that your accounts don't appear or you have 0 MetaCoin, ensure you've configured that source properly. If using MetaMask, see the following link. Feel free to delete this warning. :) http://truffleframework.com/tutorials/truffle-and-metamask")
    // Use Mist/MetaMask's provider
    window.web3 = new Web3(web3.currentProvider);
  } else {
    console.warn("No web3 detected. Falling back to http://localhost:8545. You should remove this fallback when you deploy live, as it's inherently insecure. Consider switching to Metamask for development. More info here: http://truffleframework.com/tutorials/truffle-and-metamask");
    // fallback - use your fallback strategy (local node / hosted node + in-dapp id mgmt / fail)
    window.web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
  }

  App.start();
});



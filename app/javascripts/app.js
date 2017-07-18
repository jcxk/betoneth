// Import the page's CSS. Webpack will know what to do with it.
import "../stylesheets/app.css";

// Import libraries we need.
import { default as Web3} from 'web3';
import { default as contract } from 'truffle-contract'

// Import our contract artifacts and turn them into usable abstractions.
import bettingon_artifacts from '../../build/contracts/BettingonDeploy.json'

var Bettingon = contract(bettingon_artifacts);

const FUTURE     = 0  // Not exists yet
const OPEN       = 1  // Open to bets
const CLOSED     = 2  // Closed to bets, waiting oracle to set the price
const PRICEWAIT  = 3  // Waiting set the price
const PRICESET   = 4  // Oracle set the price, calculating best bet
const PRICELOST  = 5  // Oracle cannot set the price [end]
const RESOLVED   = 6  // Bet calculated 
const FINISHED   = 7  // Prize paid [end]

var accounts;
var account;
var bon;
var betCycleLength;      
var betCycleOffset;      
var betMinRevealLength;
var betMaxRevealLength;
var betAmount;
var platformFee;
var boatFee;
var priceUpdater;

bon = Bettingon.at("0x7B77eBD4760D80A12586097ec1527ff8367a067f")

window.App = {

  start: function() {
    var self = this;

    self.setStatus("Loading...",true);

    // Bootstrap the MetaCoin abstraction for Use.
    Bettingon.setProvider(web3.currentProvider);

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

      let getBonFunc

      if (typeof bon === 'undefined') {

        getBonFunc = Bettingon.deployed();

      } else {

        getBonFunc = new Promise(function (resolve, reject) {
            resolve(bon);
        });

      } 

      getBonFunc.then(function(_bon) {
        bon = _bon;
        console.log("bon=",bon.address)
        return Promise.all([
            bon.betCycleLength(),
            bon.betCycleOffset(),
            bon.betMinRevealLength(),
            bon.betMaxRevealLength(),
            bon.betAmount(),
            bon.platformFee(),
            bon.boatFee(),
            bon.lastRevealedRound(),
            bon.resolvingRound(),
            bon.boat(),
            bon.getNow(),
            bon.priceUpdater()
         ])
      })
      .then(function (_values) {

        let now = Math.floor(Date.now() / 1000);
        betCycleLength = _values[0].toNumber();
        betCycleOffset = _values[1].toNumber();
        betMinRevealLength = _values[2].toNumber();
        betMaxRevealLength = _values[3].toNumber();
        betAmount = _values[4].toNumber();
        platformFee = _values[5].toNumber();
        boatFee = _values[6].toNumber();
        priceUpdater = _values[11];

        let paramInfo = "";

        paramInfo+="betCycleLength="+betCycleLength;
        paramInfo+="\nbetCycleOffset="+betCycleOffset;
        paramInfo+="\nbetMinRevealLength="+betMinRevealLength;
        paramInfo+="\nbetMaxRevealLength="+betMaxRevealLength;
        paramInfo+="\nbetAmount="+betAmount;
        paramInfo+="\nplatformFee="+platformFee;
        paramInfo+="\nboatFee="+boatFee;
        paramInfo+="\nlastRevealedRound="+_values[7].toNumber();
        paramInfo+="\nresolvingRound="+_values[8].toNumber();
        paramInfo+="\nboat="+_values[9].toNumber();
        paramInfo+="\nnowhost, nowevm:"+now+","+_values[10].toNumber();
        paramInfo+="\npriceUpdater="+priceUpdater;

        console.log(paramInfo);

        let displayInfo = ""; 
        displayInfo += "Boat : " + self.toEth(_values[9])+" ETH"
        displayInfo += "<br>Bet amount : " + self.toEth(_values[4])+" ETH"
        displayInfo += "<br>New round each : " + self.timediff2str(betCycleLength)
        displayInfo += "<br>UTC time is : " + new Date()
        displayInfo += "<br>Deployed at : " + self.formatAddr(bon.address)+", updater is in "
          + self.formatAddr(priceUpdater)        
        displayInfo += "<br><br>"

        document.getElementById("paramInfo").innerHTML = displayInfo

        if (priceUpdater!=bon.address) {
           document.getElementById("setprice").style = "display: none;" 
        }
        self.setStatus("Loaded",false);

        self.refresh();
      })
    })
  },

  formatAddr : function (addr) {
    return "<a href=https://etherscan.io/address/"+addr+" target="+addr+">"+addr.substring(2, 9)+"</a>";
  },

  formatTrn : function (txn) {
    return "<a href=https://etherscan.io/tx/"+txn+" target="+txn+">"+txn.substring(2, 11)+"</a>";
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
    if (working) message+="<img height=40 width=40 src='https://s-media-cache-ak0.pinimg.com/originals/d9/93/3c/d9933c4e2c272f33b74ef18cdf11a7d5.gif'>"
    status.innerHTML = message;
  },

  toEth : function(v) {
    return web3.toBigNumber(v).div(web3.toWei(1,'finney'))/1000
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

     if (d>0) {
       return pad(d)+"d"+pad(h)+"h"+pad(m)+"m";
     } else {
       return pad(h)+"h"+pad(m)+"m"; 
     }
  },

  roundFullInfo : function (roundNo,now) {
    var self = this;

    let info;

    return bon.getRoundAt(roundNo, web3.toBigNumber(now))
    .then(function(_values) {
      info = "<b>"+self.roundInfoFromValues(roundNo,_values,now)+"</b>"
      let bets = []
      for (let betNo = 0; betNo < _values[3].toNumber(); betNo++) { 
        bets.push(bon.getBetAt(roundNo,betNo));
      } 
      return Promise.all(bets)
    }).then(function(_bets) {
      for (let betNo = 0; betNo < _bets.length; betNo++) { 
        info += "<br>&#x2605;" + self.formatAddr(_bets[betNo][0]) +" bets for "+_bets[betNo][1].toNumber()/1000+" USD/ETH"
      } 
      info+="<br><br>"
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
        "PRICEWAIT",
        "PRICESET ",
        "PRICELOST",
        "RESOLVED  ",
        "FINISHED  "
      ]

      let [
        roundId,
        status,
        closeDate,
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

      let info ="ROUND #"+roundId
      info += " "+statuses[status];
      info += " "+betCount+" bets ";

      switch (status) {
        case FUTURE :
        case OPEN :
          info += " - "+self.timediff2str(closeDate-now)+" to close."
          info += "<br>bets are for price published in "+new Date(1000*(closeDate+betMinRevealLength));         
          info += "&nbsp;<button id='bid' onclick='App.uiBid("+roundId+")'> Bid </button>"
          break;
        case CLOSED :
           info += " - "+self.timediff2str(closeDate+betMinRevealLength-now)+" to oraclize sets the price."
           info += "<br>bets are for price published in "+new Date(1000*(closeDate+betMinRevealLength));
           break;
        case PRICEWAIT :
           info += " - "+self.timediff2str(closeDate+betMaxRevealLength-now)+" deadline to oraclize sets the price."
           info += "<br>bets are for price published in "+new Date(1000*(closeDate+betMinRevealLength));
           break;
        case PRICESET :
           info += " - target="+target+" "+lastCheckedBetNo+"/"+betCount+" resolved."
           info += "&nbsp;<button onclick='App.uiForceResolve("+roundId+")'> Resolve </button>"
           info += "&nbsp;<button onclick='App.uiRefund("+roundId+")'> Refund </button>"
           break;
        case PRICELOST :
           break;
        case RESOLVED :
           info += " - target="+target+" winner is "+closestBetNo
           info += "<br><button onclick='App.uiRefund("+roundId+")'> Refund </button>"
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
   
    self.setStatus("Refreshing",true);    

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
      document.getElementById("info").innerHTML = info;
      self.setStatus("",false);    
    })
    .catch(function(e) {
      self.setStatus("Failed",false);    
      console.log(e);
    });
  },

  doTransaction : function (_promise) {

    var self = this;

    self.setStatus("Waiting network agrees with operation",true);

    _promise
    .then ( (_tx) => {
      self.setStatus("Waiting network agrees with operation "+self.formatTrn(_tx.tx)+"...",true);
      console.log("tx "+_tx.tx);
      return self.getTransactionReceiptMined(_tx.tx);     
    }).then ( ( _resolve, _reject ) => {
      self.refresh();
      self.setStatus("Success",false);
    }).catch ( (e) => {
      console.log(e);
      self.setStatus("Failed",false);
    })

  },

  uiBid : function(roundId) {

    var self = this;

    let targetStr = prompt("Your bid? (e.g. 215.500)")
    if (targetStr === null) {
      return; 
    }

    let target=Math.round(parseFloat(targetStr)*1000)
    self.doTransaction(
      bon.bet(roundId,target,{from: account, value: betAmount })
    );

  },

  uiSetPrice : function() {

    var self = this;

    let target = prompt("Set target to:")
    if (target === null) {
      return; 
    }
    self.doTransaction(
      bon.__updateEthPrice(target,"",{from: account})
    );

  },

  uiForceResolve : function(roundId) {

    var self = this;

    self.doTransaction(
      bon.forceResolveRound(roundId,{from: account})
    );

  },

  uiRefund : function(roundId) {

    var self = this;

    self.doTransaction(
      bon.refund(roundId,{from: account})
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



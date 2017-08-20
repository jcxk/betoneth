// Import libraries we need.
import { default as Web3 } from 'web3';
import { default as contract } from 'truffle-contract'
import { default as Helper } from './helper.js';
import { default as CandlebarGraph } from './candlebargraph.js';
import { default as DirectoryCached } from './directorycached.js';

// Import our contract artifacts and turn them into usable abstractions.
import bettingonArtifact from '../../build/contracts/Bettingon.json'
import bettingonuitestdeployArtifact from '../../build/contracts/BettingonUITestDeploy.json'
import directoryArtifact from '../../build/contracts/Directory.json'

import { default as $ } from 'jquery';

const FUTURE     = 0  // Not exists yet
const OPEN       = 1  // Open to bets
const CLOSED     = 2  // Closed to bets, waiting oracle to set the price
const PRICEWAIT  = 3  // Waiting set the price
const PRICESET   = 4  // Oracle set the price, calculating best bet
const PRICELOST  = 5  // Oracle cannot set the price [end]
const RESOLVED   = 6  // Bet calculated 
const FINISHED   = 7  // Prize paid [end]

export default class BettingonDApp {

  constructor() {
      this._statuses = [
        "FUTURE", "OPEN", "CLOSED",
        "PRICEWAIT", "PRICESET", "PRICELOST",
        "RESOLVED", "FINISHED"
      ]
      this._candleBar = new CandlebarGraph($('#canvas')[0])
      this._Bettingon = contract(bettingonArtifact);
      this._Directory = contract(directoryArtifact);
      this._BettingonUITestDeploy = contract(bettingonuitestdeployArtifact);
  }

  async start() {

    var self = this;

    this.setStatus("Loading...",true);

    // Bootstrap the MetaCoin abstraction for Use.
    this._Bettingon.setProvider(web3.currentProvider);
    this._Directory.setProvider(web3.currentProvider);
    this._BettingonUITestDeploy.setProvider(web3.currentProvider);

    // Get the initial account balance so it can be displayed.
    web3.eth.getAccounts(async function(err, accs) {

      if (err != null) {
        alert("There was an error fetching your accounts.");
        return;
      }

      if (accs.length == 0) {
        alert("Couldn't get any accounts! Make sure your Ethereum client is configured correctly.");
        return;
      }

      self._accounts = accs;
      self._account = accs[0];

      await self.loadBettingtonParameters()
      await self.refresh()

    })

  }

  async loadBettingtonParameters()  {

    var self = this;

    const deploy = await this._BettingonUITestDeploy.deployed();    
    this._bon = this._Bettingon.at(await deploy.bon())
    this._directory = this._Directory.at(await deploy.d())
    this._directoryCached = new DirectoryCached(this._directory)
    this._betCycleLength = (await this._bon.betCycleLength()).toNumber();
    this._betCycleOffset = (await this._bon.betCycleOffset()).toNumber();
    this._betMinRevealLength = (await this._bon.betMinRevealLength()).toNumber();
    this._betMaxRevealLength = (await this._bon.betMaxRevealLength()).toNumber();
    this._betAmount = await this._bon.betAmount();
    this._platformFee = (await this._bon.platformFee()).toNumber();
    this._boatFee = (await this._bon.boatFee()).toNumber();
    this._priceUpdater = await this._bon.priceUpdater();
    this._boat = (await this._bon.boat()).toNumber();

    let displayInfo = ""; 
    displayInfo += "Boat : " + Helper.formatEth(this._boat)+" ETH"
    displayInfo += "<br>Bet amount : " + Helper.formatEth(this._betAmount)+" ETH"
    displayInfo += "<br>New round each : " + Helper.formatTimeDiff(this._betCycleLength)
    displayInfo += "<br>UTC time is : " + new Date()
    displayInfo += "<br>Deployed at : " + Helper.formatAddr(this._bon.address)+", updater is in "
      + Helper.formatAddr(this._priceUpdater)        
    displayInfo += "<br><br>"

    web3.eth.getBalance(this._priceUpdater, function(err,val) {
        if (val==0) {
          alert("Top up priceupdater "+self._priceUpdater)
        }      
    })

    $('#paramInfo').html(displayInfo)
    this.setStatus("Loaded",false);

  }

  async refresh() {

    const now = Math.floor(Date.now() / 1000);
    this.setStatus("Refreshing",true);    

    await this._directoryCached.embedMemberIcon(
      this._account,$('#currentMember'),
      "javascript:app.uiChangeName()"
    )

    const roundCount = (await this._bon.getRoundCount(web3.toBigNumber(now))).toNumber();

    Helper.removeTableRows($("#currentRoundTable")[0])
    Helper.removeTableRows($("#pastRoundsTable")[0])

    let step = this._betCycleLength

    if (step < 7200) step = 7200;
    const startTime = (+new Date() / 1000) - 40 * step
    const endTime= (+new Date() / 1000) + 2 * step + this._betMaxRevealLength 
    await this._candleBar.invalidate(startTime,endTime,step)

    for (let roundNo = roundCount - 1; roundNo >=0 ; roundNo--) {
      await this.displayRound(roundNo,now);
    } 

    this.setStatus("",false);

  }

  async displayRound(roundNo, now) {

      var self = this;

      const _values = await this._bon.getRoundAt(roundNo, web3.toBigNumber(now))

      let [
        roundId, status, closeDate,
        betCount, target, lastCheckedBetNo,
        closestBetNo
      ] = [ 
        _values[0].toNumber(), _values[1].toNumber(), _values[2].toNumber(),
        _values[3].toNumber(), _values[4].toNumber(), _values[5].toNumber(),
        _values[6].toNumber()
      ];

      let info = ""
      let actions = ""

      const bidButton = "<button id='bid' onclick='app.uiBid("+roundId+")'>Bid</button>"
      const withdrawButton = "<button onclick='app.uiWithdraw("+roundId+")'>Withdraw</button>"
      const resolveButton = "<button onclick='app.uiResolve("+roundId+")'>Resolve</button>"
      const showBetsButton = "<button onclick='app.uiShowBets("+roundId+")'>Show bets</button>"

      const pricePublishDate = closeDate+this._betMinRevealLength

      switch (status) {
        case FUTURE :
        case OPEN :
          info += Helper.formatTimeDiff(closeDate-now)+" to close."
          info += "<br>bets are for price published in "+new Date(1000*pricePublishDate);         
          actions += bidButton
          break;
        case CLOSED :
           info += Helper.formatTimeDiff(closeDate+this._betMinRevealLength-now)+" to oraclize starts set the price."
           info += "<br>bets are for price published in "+new Date(1000*pricePublishDate);
           actions += showBetsButton
           break;
        case PRICEWAIT :
           info += Helper.formatTimeDiff(closeDate+this._betMaxRevealLength-now)+" deadline to oraclize sets the price."
           info += "<br>bets are for price published in "+new Date(1000*pricePublishDate);
           break;
        case PRICESET :
           info += "Price is "+target+" USD/ETH ["+lastCheckedBetNo+"/"+betCount+" resolved]"
           actions += showBetsButton
           actions += resolveButton
           actions += withdrawButton
           break;
        case PRICELOST :
           actions += showBetsButton
           actions += withdrawButton
           break;
        case RESOLVED :
           info += "Price is "+target+" USD/ETH"
           actions += showBetsButton
           actions += withdrawButton
           break;
        case FINISHED :
           actions += showBetsButton
           info += "Price is "+target+" USD/ETH "
           break;
      }

      if (status == OPEN){

        this._candleBar.drawTimeGrid(
          pricePublishDate,
          CandlebarGraph.TARGETCOLOR
        )

        $('#currentRoundInfo').html(info)
        $("#currentRoundBetActions").html(actions);

        if (betCount==0) {
            Helper.addTableRow(
              $("#currentRoundTable"),
              ["<i>No bets</i>",""],
              this._directoryCached
            )
        }

        for (let betNo = 0; betNo < betCount; betNo++) { 
          const bet = await this._bon.getBetAt(roundNo,betNo);
          Helper.addTableRow(
              $("#currentRoundTable"),
              [bet[1].toNumber()/1000,"member:"+bet[0]],
              this._directoryCached
          )
          this._candleBar.drawBet(pricePublishDate,bet[1].toNumber()/1000)
        } 

      } else {

        Helper.addTableRow(
          $("#pastRoundsTable"),
          [roundId,betCount,this._statuses[status],info,actions],
          this._directoryCached
        )
      }

      return closeDate+this._betMinRevealLength;
  }

  setStatus(message,working) {
    if (working) message+="<img height=40 width=40 src='https://s-media-cache-ak0.pinimg.com/originals/d9/93/3c/d9933c4e2c272f33b74ef18cdf11a7d5.gif'>"
    $('#status').html(message);
  }

  doTransaction(promise) {

    var self = this;
    this.setStatus("Waiting network agrees with operation",true);

    return promise
    .then ( (tx) => {
      self.setStatus("Waiting network agrees with operation "+Helper.formatTrn(tx.tx)+"...",true);
      console.log("tx "+tx.tx);
      return Helper.getTransactionReceiptMined(tx.tx);     
    }).then ( ( resolve, reject ) => {
      self.setStatus("Success",false);
      self.refresh()
    }).catch ( (e) => {
      console.log(e);
      self.setStatus("Failed",false);
    })

  }

  uiBid(roundId) {

    var self = this;

    let targetsStr = prompt("Your bids? (e.g. 215.500,199.2)")
    if (targetsStr === null) {
      return; 
    }

    let targets=targetsStr.split(",").map(function(x){return Math.round(parseFloat(x)*1000)})
    this.doTransaction(
      self._bon.bet(
        roundId,targets,
        {from: self._account, value: self._betAmount.mul(targets.length), gas: 700000 }
      )
    );

  }

  uiResolve(roundId) {

    var self = this;

    self.doTransaction(
      self._bon.resolve(roundId,999,{from: self._account, gas: 700000})
    );

  }

  uiShowBets(roundId) {

    var self = this;

  }

  uiChangeName() {

    let newName = prompt("Change your name to...")

    if (newName === null) {
      return; 
    }
    
    this._directoryCached.invalidate(this._account)
    
    this.doTransaction(
      this._directory.setName(newName, {from: this._account})
    )

  }

  uiWithdraw(roundId) {

    var self = this;

    self.doTransaction(
      self._bon.withdraw(roundId,{from: self._account, gas: 700000})
    );

  }

}


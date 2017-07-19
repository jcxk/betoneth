import React from 'react'
import {connect} from 'react-redux'
import {AppBar} from 'material-ui'
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider'
import Drawer from 'material-ui/Drawer'
import BetForm from './BetForm'
import * as AppActions from "../../actions/app";
import ContractManager from "../../lib/contractManager.js";
import moment from 'moment';
require("moment-duration-format");
import * as _ from 'lodash';

export class Home extends React.Component {



    constructor(props) {
        super(props);
        this.state = {open: false};
        this.handleToggle = this.handleToggle.bind(this);
        this.handleClose = this.handleClose.bind(this);
        this.placeBet = this.placeBet.bind(this);
        this.account = "";
        console.log(this.props)
    }

    handleToggle() {
        this.setState({open: !this.state.open})
    }

    handleClose() {
        this.setState({open: true})
    }

    async getContract(web3) {
        this.contractManager = new ContractManager(web3,'development');
        await this.contractManager.init();
        console.log(this.contractManager);
        this.props.dispatch(
            AppActions.betConfig(
                this.contractManager.config
            )
        );

        this.props.dispatch(
            AppActions.getRounds(
                await this.contractManager.getRounds(
                    await this.contractManager.getRoundCount(Date.now())
                )
            )
        );
        console.log(
          this.contractManager.account, 'get account'
        );
    }

    componentDidMount() {

        window.addEventListener('load', () =>  {
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
          window.web3.eth.getAccounts(
            (err,accs) => {
              this.getContract(window.web3);
              this.contractManager.account = accs != null ? accs[0] : false;
            }
          );

        });

    }

    async placeBet(values) {
        console.log(values);
        this.contractManager.uiBid(values.expected_value);
      this.props.dispatch(
        AppActions.getRounds(
          await this.contractManager.getRounds(
          1,1
        )));

    }



    renderRounds(rounds) {



        if (rounds != false) {
            return _.reverse(_.map(rounds,(item, index) =>  {
                let info = "";
                switch (this.contractManager.getStatus(item.status)) {

                    case "FUTURE" :
                    case "OPEN" :
                        console.log(new Date(item.closeDate));
                        console.log(this.contractManager.config.betMinRevealLength.toNumber());
                        info += " - "+moment(item.closeDate).format()+" to close.";
                        info += "\nbets are for price published in "+ moment(item.closeDate).add(this.contractManager.config.betMinRevealLength.toNumber(),"seconds").format();
                        break;
                        /*
                    case "CLOSED" :
                        info += " - "+self.timediff2str(closeDate+betMinRevealLength-now)+" to oraclize sets the price."
                        info += "\nbets are for price published in "+new Date(1000*(closeDate+betMinRevealLength));
                        break;
                    case "PRICEWAIT":
                        info += " - "+self.timediff2str(closeDate+betMaxRevealLength-now)+" deadline to oraclize sets the price."
                        info += "\nbets are for price published in "+new Date(1000*(closeDate+betMinRevealLength));
                        break;
                        */
                    case "PRICESET" :
                        info += " - price is "+item.target+" ETH/USD "+item.lastCheckedBetNo+"/"+item.betCount+" resolved."
                        break;
                    case "PRICELOST" :
                        break;
                    case "RESOLVED" :
                    case "FINISHED" :
                        info += " - price is "+item.target+" ETH/USD and  winner account is "+item.bets[item.closestBetNo].account;
                        break;
                }
                return(
              <div>
                    <p key={index}>round: #{index} | bets {item.bets.length} | {this.contractManager.getStatus(item.status)} -> {info}</p>
                  <ul>
                    {_.map(item.bets, (item,index) => <li>#{index} {item.target} from {item.account}</li>)}
                  </ul>
              </div>
                )
            }));
        } else {
            return <p>Rounds Loading..</p>
        }
    }



    renderConfig(config) {
        if (config != false) {
            let roundDuration = moment.duration(config.betCycleLength.toNumber(), "seconds");
            return (
            <div>
                <p>Deployed at {this.contractManager.contract.address} , updater at {config.priceUpdater}</p>
                <p>Bet amount {this.contractManager.toEth(config.betAmount)} ETH</p>
                <p>Boat {this.contractManager.toEth(config.boat)} ETH</p>
                <p>New round each in {roundDuration.format("d[d] h:mm:ss")}</p>
                <p>UTC time is {moment.utc().format('LLL')}</p>
            </div>
            );
        } else {
            return (<img src='http://keegansirishpub.net/wp-content/themes/octane-bootstrap/images/loader.gif'/>);
        }
    }

    render() {

        return (
            <div>
                <MuiThemeProvider>
                    <div>
                        <AppBar
                            onLeftIconButtonTouchTap={this.handleToggle}
                            title="Bettingon"
                        />
                        <BetForm onSubmit={this.placeBet}/>
                        {this.renderRounds(this.props.app.rounds)}
                        {this.renderConfig(this.props.app.config)}
                    </div>
                </MuiThemeProvider>

            </div>
        )
    }
}

function mapStateToProps(state) {
    console.log(state.app, 'refresh state');
    return {
        app: state.app
    }
}

export default connect(mapStateToProps)(Home)

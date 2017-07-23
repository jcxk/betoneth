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
import { Link } from 'react-router-dom';
import ReactTable from 'react-table';

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

    async getContract(web3, env) {
        this.contractManager = new ContractManager(web3, env);
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
        var self = this;
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
              let env = window.web3.version.network == 1 ? 'production' : 'development';
              this.getContract(window.web3, env);
              this.contractManager.account = accs != null ? accs[0] : false;
            }
          );

          var account = window.web3.eth.accounts[0];
          var accountInterval = setInterval(function() {
            if (window.web3.eth.accounts[0] !== account) {
              account = window.web3.eth.accounts[0];
              self.forceUpdate();
              self.contractManager.account = account;
              console.log('changed account detected', self.contractManager.account);
            }
          }, 100);
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


          /*
          return _.reverse(_.map(rounds,(item, index) =>  {
                let info = "";
                let now = new Date();
                let closeDateinfo = "\nbets are for price published in "+ new Date(
                  1000*(item.closeDate+this.contractManager.config.betMinRevealLength.toNumber())
                );
                switch (this.contractManager.getStatus(item.status)) {

                    case "FUTURE" :
                  case "OPEN" :
                        info += " - "+this.contractManager.timediff2str(item.closeDate-now)+" to close."
                        info +=closeDateinfo;
                        break;

                    case "CLOSED" :
                        info += " - "+this.contractManager.timediff2str(item.closeDate+this.contractManager.config.betMinRevealLength.toNumber()-now)+" to oraclize sets the price."
                        info +=closeDateinfo;
                        break;
                    case "PRICEWAIT":
                        info += " - "+this.contractManager.timediff2str(item.closeDate+this.contractManager.config.betMinRevealLength.toNumber()-now)+" deadline to oraclize sets the price."
                        info +=closeDateinfo;
                        break;
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


*/

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
      const columns = [

        {
          Header: 'Round',
          accessor: 'roundId',
          Cell: props => { return '#'+props.value}
        },
        {
          Header: 'Total Bets',
          accessor: 'bets',
          Cell: props => { return props.value.length}
        },
        {
          Header: 'Status',
          accessor: 'status',
          Cell: props => { return this.contractManager.getStatus(props.value)}
        },
        {
          Header: 'Time to Close',
          accessor: 'closeDate',
          Cell: props => {
            return this.contractManager.timediff2str(props.value-new Date())
          }
        },
        {
          Header: 'Options',
          Cell: (props) => {

            if (props.row.status == 6) {
              return (
                <button onClick={(e) => {
                  e.preventDefault();
                  this.contractManager.refund(props.row.roundId)
                }}>Refund</button>
              )
            }
          }
        }
      ];

      return (
            <div>
                <MuiThemeProvider>
                    <div>
                        <AppBar
                            onLeftIconButtonTouchTap={this.handleToggle}
                            title="Bettingon"
                        />
                      <Link to ="/about">About</Link>
                        <BetForm onSubmit={this.placeBet}/>
                      {this.renderConfig(this.props.app.config)}
                      {this.renderRounds(this.props.app.rounds)}

                        <ReactTable
                        loading={this.props.app.rounds == false}
                        data={this.props.app.rounds}
                        columns={columns}
                        sorted={[{
                          id: 'round',
                          desc: true
                        }]}
                        />

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

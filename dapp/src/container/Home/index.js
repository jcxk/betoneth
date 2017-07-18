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
        super(props)
        this.state = {open: false}
        this.handleToggle = this.handleToggle.bind(this)
        this.handleClose = this.handleClose.bind(this)
        this.placeBet = this.placeBet.bind(this);
        console.log(this.props)
    }

    handleToggle() {
        this.setState({open: !this.state.open})
    }

    handleClose() {
        this.setState({open: true})
    }

    async getContract(web3) {
        this.contractManager = new ContractManager(web3,'production');
        this.props.dispatch(
            AppActions.betConfig(
                await this.contractManager.getConfig()
            )
        );
    }

    componentDidMount() {
        var self = this;
        window.addEventListener('load', function () {
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

            self.getContract(window.web3);
        });

    }

    placeBet(values) {
        console.log(values)
        //adding current round to values.
        let betObj = {
            round: 1,
            ...values
        }
        this.props.dispatch(AppActions.placeBet(betObj));
    }

    renderBets(bets) {
        return bets.map(function (item, index) {
            return <li key={index}>round: {item.round} - expected: {item.expected_value}</li>
        });
    }



    renderConfig(config) {
        if (config != false) {
            let roundDuration = moment.duration(config.betCycleLength.toNumber(), "seconds");
            return (
            <div>
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
                        {this.renderBets(this.props.app.bets)}
                        {this.renderConfig(this.props.app.config)}
                    </div>
                </MuiThemeProvider>

            </div>
        )
    }
}

function mapStateToProps(state) {
    console.log(state);
    return {
        app: state.app
    }
}

export default connect(mapStateToProps)(Home)
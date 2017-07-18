import React from 'react'
import { connect } from 'react-redux'
import { AppBar } from 'material-ui'
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider'
import Drawer from 'material-ui/Drawer'
import BetForm from './BetForm'
import * as AppActions from "../../actions/app";
import ContractManager from  "../../lib/contractManager.js";

export class Home extends React.Component {

  constructor (props) {
    super(props)
    this.state = {open: false}
    this.handleToggle = this.handleToggle.bind(this)
    this.handleClose = this.handleClose.bind(this)
    this.placeBet = this.placeBet.bind(this);
    console.log(this.props)
  }

  handleToggle () {
    this.setState({open: !this.state.open})
  }

  handleClose () {
    this.setState({open: true})
  }

  async getContract(web3) {
    this.contractManager = new ContractManager(web3);
    //console.log(await this.contractManager.config);
    console.log(await this.contractManager.getConfig());

  }
  componentDidMount () {
    this.getContract(window.web3);
  }

  placeBet (values) {
    console.log(values)
    //adding current round to values.
    let betObj = {
      round : 1,
      ...values
    }
    this.props.dispatch(AppActions.placeBet(betObj));
  }

  renderBets(bets) {
    return bets.map(function(item, index){
           return <li key={index}>round: {item.round} - expected: {item.expected_value}</li>
    });
  }

  render () {
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
          </div>
        </MuiThemeProvider>

      </div>
    )
  }
}
function mapStateToProps (state) {
  return {
    app: state.app
  }
}
export default connect(mapStateToProps)(Home)
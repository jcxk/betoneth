import React from 'react';
import { Page, Section } from 'react-page-layout';
import {connect} from 'react-redux';

export class ContractPage extends React.Component {

    constructor(props) {
        super(props);
    }

    render() {
      return (
        <Page layout="public">
          <Section slot="main">
            <div>
              <p>Deployed at {this.props.config.address} , updater at {this.props.config.priceUpdater}</p>
            </div>
          </Section>
        </Page>
        );
    }
}


function mapStateToProps(state) {
  return {
    config: state.app.config
  }
}

export default connect(mapStateToProps)(ContractPage)

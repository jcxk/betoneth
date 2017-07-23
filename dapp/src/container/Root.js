import React, { Component } from 'react';
import { Provider } from 'react-redux';
import Routes from '../routes';
//import { Router } from 'react-router';
import { BrowserRouter as Router } from 'react-router-dom';

export default class Root extends Component {
  render() {
    const { store, history } = this.props;
    return (
      <Provider store={store}>
        <Router history={history} >
          <Routes />
        </Router>
      </Provider>
    );
  }
}

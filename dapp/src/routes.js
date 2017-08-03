import React from 'react';
import { Route, Switch , Redirect } from 'react-router-dom';
import { withRouter } from 'react-router';
import App from './container/App';
import Home from './container/Home';
import About from './container/About';
import ContractPage from './container/Contract';

const NoMatch = ({ location }) => (
  <div >
    <h1>YOUR ARE BLOCKED, 404</h1>
    <img src="/blocked.jpg" />
  </div>
);


const RouteNotFound = () => <Redirect to={{ state: { notFoundError: true } }} />;
const CaptureRouteNotFound = withRouter(({children, location}) => {
  console.log(location);
  return location && location.state && location.state.notFoundError ? <NoMatch /> : children;
});

const Routes =  () =>

    <App>
      <Switch>
          <Route exact path="/" component={Home}/>
          <Route exact path="/about" component={About} />
          <Route exact path="/contract" component={ContractPage} />
          <Route component={NoMatch} />
      </Switch>
    </App>

;
export default Routes;


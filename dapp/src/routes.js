import React from 'react';
import { Route, Switch } from 'react-router-dom';

import App from './container/App';
import Home from './container/Home';
import NotFound from './container/NotFound';

const About = () => (
  <div>
    <h2>About</h2>
  </div>
);

const Routes =  () =>
  <App>
    <Switch>
        <Route exact path="/" component={Home}/>
        <Route path="/about" component={About} />
        <Route component={NotFound}/>
    </Switch>
  </App>
;
export default Routes;

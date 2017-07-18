import React from 'react';
import { Route, IndexRoute } from 'react-router';

import App from './container/App/index';
import Home from './container/Home/index';
import NotFound from './container/NotFound/index';

export default (
  <Route path="/" component={App}>
    <IndexRoute component={Home}/>
    <Route path="*" component={NotFound}/>
  </Route>
);

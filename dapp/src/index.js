import React from 'react';
import { render } from 'react-dom';

import { AppContainer } from 'react-hot-loader';
import Root from './container/Root';
import configureStore from './store/configureStore';

import { syncHistoryWithStore } from 'react-router-redux';
import injectTapEventPlugin from 'react-tap-event-plugin';
injectTapEventPlugin();
const store = configureStore();

//import { browserHistory } from 'react-router';
//const history = syncHistoryWithStore(browserHistory, store);

import createHistory from 'history/createBrowserHistory';
const history = syncHistoryWithStore(createHistory(), store);

render(
    <AppContainer>
        <Root store={store} history={history} />
    </AppContainer>,
    document.getElementById('app')
);

if (module.hot) {
    module.hot.accept('./container/Root', () => {
        const NewRoot = require('./container/Root').default;
        render(
            <AppContainer>
                <NewRoot store={store} history={history} />
            </AppContainer>,
            document.getElementById('app')
        );
    });
}

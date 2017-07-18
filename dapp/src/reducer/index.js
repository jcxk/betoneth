import { combineReducers } from 'redux';
import {routerReducer} from 'react-router-redux';

import appReducer from './app';
import { reducer as formReducer } from 'redux-form';

const rootReducer = combineReducers({
  app: appReducer,
  form: formReducer,
  routing: routerReducer
});

export default rootReducer;

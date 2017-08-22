import * as _ from 'lodash';

const initialState = {
    env: 'production',
    config: false,
    rounds: []
};

export default function appReducer(state = initialState, action) {
    switch (action.type) {
      case 'PLACE_BET':
            console.log(action.payload.roundId.toNumber());
            let r = _.find(state.rounds, ['roundId', action.payload.roundId.toNumber() ]);

            let betObj = {
              account: action.payload.account,
              target: action.payload.targets[0].toNumber()
            };
            let b = _.find(r, betObj);
            if (r != null && b==null) {
              r.betCount++;
              r.bets.push(betObj);
            }
            return {
                ...state
            };
      case 'CONFIG_BET':
            return {
                ...state,
                config : action.payload
            };
      case 'GET_ROUNDS':
            return {
                ...state,
                rounds : action.payload
            };
        default:
            return state;
    }
}

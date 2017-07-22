const initialState = {
    env: 'production',
    config: false,
    rounds: false
};

export default function appReducer(state = initialState, action) {
    switch (action.type) {
      case 'PLACE_BET':
            return {
                ...state,
                bets: [...state.bets, action.payload]
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

const initialState = {
    bets: [],
    config: false
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

        default:
            return state;
    }
}
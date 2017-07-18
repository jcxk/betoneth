const initialState = {
    bets: []
};

export default function appReducer(state = initialState, action) {
    switch (action.type) {
      case 'PLACE_BET':
            return {
                ...state,
                bets: [...state.bets, action.payload]
            };

        default:
            return state;
    }
}
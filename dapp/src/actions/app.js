export function placeBet(betObj) {
  return {
    type: 'PLACE_BET', payload: betObj
  };
}

export function betConfig(obj) {
    return {
        type: 'CONFIG_BET', payload: obj
    };
}






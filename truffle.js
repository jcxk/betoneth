// Allows us to use ES6 in our migrations and tests.
require('babel-register')
require('babel-polyfill');

module.exports = {
	 mainnet: {
	   network_id: 1,
	   host: "localhost",
	   port: 8545,
	   gas: 4000000,
	   gasPrice: 4e9
	 },  
     networks: {
	  rinkeby: {
	    network_id: 4,
	    host: "localhost",
	    port: 8545,
	    gas: 4000000,
	    gasPrice: 20e9
	  },  
    development: {
      host: 'localhost',
      port: 8545,
	  gas: 6000000,
      network_id: '*' // Match any network id
    }
  }
}

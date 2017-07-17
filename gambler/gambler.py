# pip install twisted
# pip install urllib2
# pip install web3
# pip install py-solc

import urllib2
import web3
import solc
import datetime
import json
import time

# ------------------------------------------------------------------------------------------
# Code to get contract data
# ------------------------------------------------------------------------------------------
# Need to create a forwarder with: ssh -L 8546:127.0.0.1:8545 eth1fwd@199.188.207.97

def get_and_filter(contractUrl):
	res = ""
	for line in urllib2.urlopen(contractUrl):
		if not (line.startswith('pragma') or line.startswith('import')):
			res += line

	return res

def get_contract():

	base_url = "https://raw.githubusercontent.com/adriamb/bettingon/96e26fa6faa883119c425c526a20cc542636c7a9/contracts"
	contract_addr = "0x7B77eBD4760D80A12586097ec1527ff8367a067f"

	src = "pragma solidity ^0.4.11;\n" + \
		get_and_filter(base_url+'/Directory.sol') + \
	    get_and_filter(base_url+'/PriceUpdater.sol') + \
	    get_and_filter(base_url+'/Bettingon.sol')

	compiled = solc.compile_source(src)

	w3 = web3.Web3(web3.HTTPProvider('http://localhost:8546'))

	contract_factory = web3.contract.construct_contract_factory(
	    web3=w3,
		abi=compiled['<stdin>:Bettingon']['abi']
	)

	contract = contract_factory(contract_addr)

	try:
		contract.call().boat()
	except web3.exceptions.BadFunctionCallOutput:
		raise RuntimeError('Cannot continue, seems that blockchain node is not yet sync.')

	return contract

def get_current_bets():
	contract = get_contract()
	bets = []
	
	roundId, roundNo, status, closeDate, betCount, target,_,_ = contract.call().getRoundById(0,0)
	for betNo in range(0,betCount):
		account, target = contract.call().getBetAt(betNo,0)
		bets.append(target/1000)

	return sorted(bets)

# ------------------------------------------------------------------------------------------
# Get last week from poloniex, weigted averages
# ------------------------------------------------------------------------------------------

def get_weekly_weightedaverages():
	weightedAverages = []
	fromt = round(time.time()) - (3600*24*7)
	url = 'https://poloniex.com/public?command=returnChartData&currencyPair=USDT_ETH&start='+str(fromt)+'&end=9999999999&period=14400'
	response = urllib2.urlopen(url)
	jsonvalues = json.load(response)
	for value in jsonvalues:
		weightedAverages.append(value['weightedAverage'])

	return weightedAverages


# ------------------------------------------------------------------------------------------
# Main code
# ------------------------------------------------------------------------------------------

# A simple strategy, just the average of ( the 4 last values and the current bets )

wwa = get_weekly_weightedaverages()
cb = get_current_bets()

sum = wwa[len(wwa)-1]+wwa[len(wwa)-2]+wwa[len(wwa)-3]+wwa[len(wwa)-4]

for bet in cb:
	sum+=bet

average = round(sum/(4+len(cb)),3)

print "My bet is ",average


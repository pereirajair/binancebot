let moment = require('moment')
let coin = require('./coin')

const prices = {

    exchange: null,
    exchange_name: 'binance',

    symbol: 'BTCUSDT',
    coinPrice: 0,
    bnbPrice: 0,

    syncPrices: async function() {
        const promisseSync = new Promise((resolve, reject) => {
            if (this.exchange_name == 'binance') {
                this.exchange.prices().then( (_prices) => {
                    let _coinPrice = coin.format(Number.parseFloat(_prices[this.symbol]),2);
                    let _bnbPrice = coin.format(Number.parseFloat(_prices['BNBUSDT']),6);
                    this.setCoinPrice(_coinPrice,_bnbPrice);
                    resolve({ coinPrice : _coinPrice, bnbPrice: _bnbPrice } );
                }) ;
            }
        });
        return promisseSync;
    },
    setCoinPrice: function(coinPrice,bnbPrice) {
        this.coinPrice = coinPrice;
        this.bnbPrice = bnbPrice;
    },
    setExchange: function(_exchange,_name = 'binance') {
        this.exchange = _exchange;
        this.exchange_name = _name;
    },
   
}

module.exports = prices;
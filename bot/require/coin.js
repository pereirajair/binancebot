

const coin = {


    pair: 'ETHBRL',
    coin_price: 57264.38,
    min_proffit: 0.03,
    capital: 19.92,

    bnb_usdt_price: 298,

    maker_fee: 0.075,
    taker_fee: 0.075,

    satoshi: 0.0000001,

    debug: true,

    setCapital: function(value) {
        this.capital = value;
        // console.log('CAPITAL: ' + this.capital);
    },

    setCoinPrice: function(value) {
        this.coin_price = Number.parseFloat(value);
        // console.log('COIN_PRICE: ' + this.coin_price);
    },
  
    format: function(value, precision) {
        var precision = precision || 0,
            power = Math.pow(10, precision),
            absValue = Math.abs(Math.round(value * power)),
            result = (value < 0 ? '-' : '') + String(Math.floor(absValue / power));
    
        if (precision > 0) {
            var fraction = String(absValue % power),
                padding = new Array(Math.max(precision - fraction.length, 0) + 1).join('0');
            result += '.' + padding + fraction;
        }
        return Number.parseFloat(result);
    },

    getCoinAmount: function(investedValue,coinPrice,precision = 6) {
        if (investedValue == null) {
            investedValue = this.capital;
        }
        if (coinPrice == null) {
            coinPrice = this.coin_price;
        }
        let amountToBuy = investedValue / coinPrice;
        return this.format(amountToBuy,precision);
    },

    getFeeInUSDT: function(amount,taker) {
        if (amount == undefined) {
            amount = this.capital;
        }
        let _fee = this.maker_fee;
        if (taker == false) {
            _fee = this.taker_fee;
        }

        let retVal = amount * (_fee / 100);
        return retVal;
    },

    getFeeInBNB: function(amount,taker = false) {
        let retVal = this.getFeeInUSDT(amount,taker);
        let fee = this.getCoinAmount(retVal,this.bnb_usdt_price,8);
        return fee;
    },

    calculateMinValueForPrice: function(_coin_price,_proffit) {
        // 0.001 - 20
        // 20,03 / 20000

        // if (_capital == undefined) {
        //     _capital = this.capital;
        // }
        if (_coin_price == undefined) {
            _coin_price = this.coin_price;
        }
        if (_proffit == undefined) {
            
        }

        // coin.setCapital(this.capital + (this.capital * proffit));
        let _retVal = _coin_price + (_coin_price * _proffit);
        return _retVal;
        // coin.setCoinPrice();

    }
    
}

module.exports = coin;
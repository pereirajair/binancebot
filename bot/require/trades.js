let moment = require('moment')
let coin = require('./coin')

const trades = {

    all_trades: [],

    prices: require('./prices'),
    exchange: null,
    exchange_name: '',

    symbol: 'BTCUSDT',
    coinPrice: 59000,
    bnbPrice: 553,

    syncTrades: async function(_symbol) {
        this.symbol = _symbol;

        const promisseSync = new Promise((resolve, reject) => {

            this.prices.syncPrices().then((coinPrice,bnbPrice) => {
                if (this.exchange != null) {
                    if (this.exchange_name == 'binance') {
                        this.exchange.trades(this.symbol, (error, _trades, symbol) => {
                            this.setTrades(_trades);
                            resolve(this);
                        });
                    }
                } else {
                    reject('EXCHANGE NOT CONFIGURED');
                    console.info('EXCHANGE NOT CONFIGURED');
                }
            });
        });
        let _retVal = Promise.all([promisseSync]).then((values) => {
            return values;
        });
        return _retVal;
    },

    setExchange: function(_exchange,_name) {
        this.exchange = _exchange;
        this.exchange_name = _name;
        this.prices.setExchange(_exchange,_name);
    },
    setTrades: function(_trades) {
        _trades.forEach((value,index,arr) => {
            _trades[index].price = Number.parseFloat(_trades[index].price);
            _trades[index].qty = Number.parseFloat(_trades[index].qty);
            _trades[index].quoteQty = Number.parseFloat(_trades[index].quoteQty);
            _trades[index].commission = Number.parseFloat(_trades[index].commission);
        }); 

        this.all_trades = _trades;
    },
    calculateProffit: function(_totals,symbolPrice,_commissionAssetPrice) {
        _totals.converted_commission = (_commissionAssetPrice * _totals.commission)
        _totals.converted_end_qty_value = (_totals.qty * symbolPrice)
        _totals.converted_estimated_proffit = (_totals.quoteQty * -1) + _totals.converted_end_qty_value
        _totals.converted_real_proffit = (_totals.quoteQty * -1) - _totals.converted_commission + _totals.converted_end_qty_value
        
        return _totals;
    },
    calculateTotals: function(_trades,symbol) {
        let _commissionAssetPrice = 553;
        let _total_qty = 0;
        let _total_quoteQty = 0;
        let _total_commission = 0;
        // let _avg_capital_invested = 0;
        let _max_invested_qty = 0;
        _trades.forEach((value,index,arr) => {
            if (value.symbol == symbol) {
                if (value.isBuyer) {
                    _total_qty = _total_qty + value.qty;
                    _total_quoteQty = _total_quoteQty + value.quoteQty;
                } else {
                    _total_qty = _total_qty - value.qty;
                    _total_quoteQty = _total_quoteQty - value.quoteQty;
                }
                if (_total_qty > _max_invested_qty) {
                    _max_invested_qty = _total_qty;
                }
                _total_commission = _total_commission + value.commission;
                
            }
        }); 
        return {
            qtd_trades: _trades.length,
            qty: _total_qty,
            quoteQty : _total_quoteQty,
            commission: _total_commission,
            max_invested_qty: _max_invested_qty
        };
    },

    filter(_startDate,symbol) {
        let _retVal = [];
        let _today = moment(); 
        this.all_trades.forEach((value,index,arr) => {
            if (value.symbol == symbol) {
                let _isInPeriod = moment(value.time).isBetween(_startDate, _today) 
                if (_isInPeriod) {
                    _retVal.push(value);
                }
            } 
        });
        return _retVal;
    },

    logTrades: function(_startDate,symbol) {
        let _trades = this.filter(_startDate,symbol);//    this.all_trades;
        _trades.forEach((value,index,arr) => {
            let _type = 'S';
            if (value.isBuyer) {
                _type = 'B';
            }
            let _time = moment(value.time);
            let line = '';
            line += _time.format('D/M/Y HH:mm') + '\t';
            line += _type + '\t';
            line += coin.format(value.price,2) + '\t';
            line += value.qty + '\t';
            line += value.quoteQty + '\t';
            line += value.commission + '\t';
            console.log(line);
        }); 
        let _totals = this.calculateTotals(_trades,symbol);
        let _proffit = this.calculateProffit(_totals,this.prices.coinPrice,this.prices.bnbPrice);
        console.log(_proffit);
    },

    getTradesResumeText: async function(startDate,symbol) {

        const promisseSync = new Promise((resolve, reject) => {
            let _trades = this.filter(startDate,symbol);
            let _totals = this.calculateTotals(_trades,symbol);
            let _proffit = this.calculateProffit(_totals,this.prices.coinPrice,this.prices.bnbPrice);
            let _text = '';

            this.exchange.balance((error, balances) => {
                // let _telegram = '';
                let _totalUsdt = coin.format(Number.parseFloat(balances.BUSD.available) + Number.parseFloat(balances.BUSD.onOrder),2);
                let _totalBtc = coin.format(Number.parseFloat(balances.BTC.available) + Number.parseFloat(balances.BTC.onOrder),6);
                let _totalBnb = coin.format(Number.parseFloat(balances.BNB.available) + Number.parseFloat(balances.BNB.onOrder),6);
                let _totalBrl = coin.format(Number.parseFloat(balances.BRL.available) + Number.parseFloat(balances.BRL.onOrder),2);
                let _totalEth = coin.format(Number.parseFloat(balances.ETH.available) + Number.parseFloat(balances.ETH.onOrder),5);
                // _telegram = 'BIA: ' + _totalUsdt + ' BTC: ' + _totalBtc + ' BNB:' + _totalBnb;
                

                _text += '<b>PROFFIT</b>: ' + coin.format(_proffit.converted_estimated_proffit,2) + '\n';
                _text += '<b>FEE</b>: -' + coin.format(_proffit.converted_commission,2) + '\n';
                _text += '<b>BALANCE</b>: ' + coin.format(_proffit.converted_real_proffit,2) + '\n';
                _text += '\n';
                _text += '\n';
                _text += '----------------\n';
                _text += '<b>TOTAL BRL</b>: ' + _totalBrl + '\n';
                _text += '<b>TOTAL ETH</b>: ' + _totalEth + '\n';
                _text += '<b>TOTAL BUSD</b>: ' + _totalUsdt + '\n';
                _text += '<b>TOTAL BTC</b>: ' + _totalBtc + '\n';
                _text += '<b>TOTAL BNB</b>: ' + _totalBnb + '\n';
                _text += '----------------\n';
                _text += '\n';
                _text += '<b>STARTED AT</b>: ' + moment(startDate).format('D/M/Y HH:mm') + '\n';
                _text += '<b>TOTAL TRADES</b>: ' + _proffit.qtd_trades + '\n';
                // console.log(_text);
                resolve(_text);
                // bia.log(_telegram,true);
            });
        });
        return promisseSync;
    },

    add: function(_symbol,_id,_order_id,_price,_qty,_quoteQty,_commission,_commissionAsset,_time,_isBuyer,_isMaker,_isBestMatch) {
        let _order = {
            symbol: _symbol,
            id: _id,
            order_id: _order_id,
            price: Number.parseFloat(_price),
            qty: Number.parseFloat(_qty),
            quoteQty: Number.parseFloat(_quoteQty),
            commission: Number.parseFloat(_commission),
            commissionAsset: _commissionAsset,
            time: _time,
            isBuyer: isBuyer,
            isMaker: isMaker,
            isBestMatch: isBestMatch
        }
        this.all_trades.push(_order); 
    },
    
}

module.exports = trades;
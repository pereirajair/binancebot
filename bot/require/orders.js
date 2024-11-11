let moment = require('moment')
let coin = require('./coin')

const orders = {

    open_orders: [],
    created_orders: [ ],
    debug: true,
    exchange: null,
    exchange_name: 'binance',
    client: null,

    syncOrders: async function(_symbol) {

        const promisseSync = new Promise(async (resolve, reject) => {
            if (this.exchange != null) {
                if (this.exchange_name == 'binance') {

                    let openOrders = await this.exchange.openOrders({ symbol: _symbol });
                    this.setOpenOrders(openOrders);
                    resolve(this);
                }
            } else {
                reject('EXCHANGE NOT CONFIGURED');
                console.info('EXCHANGE NOT CONFIGURED');
            }
        });
        return promisseSync;
    },
    setClient: function(_client) {
        this.client = _client;
    },
    setExchange: function(_exchange,_name = 'binance') {
        this.exchange = _exchange;
        this.exchange_name = _name;
    },
    setOrders: function(createdOrders,openOrders) {
        this.created_orders = createdOrders;
        this.open_orders = openOrders;
    },
    getOrders: function() {
        return { created_orders : this.created_orders, open_orders : this.open_orders };
    },
    
    parseOrder: function(_order) {
        _order.price                = Number.parseFloat(_order.price);
        _order.executedQty          = Number.parseFloat(_order.executedQty);
        _order.origQty              = Number.parseFloat(_order.origQty);
        _order.origQuoteOrderQty    = Number.parseFloat(_order.origQuoteOrderQty);
        _order.stopPrice            = Number.parseFloat(_order.stopPrice);
        _order.cummulativeQuoteQty  = Number.parseFloat(_order.cummulativeQuoteQty);
        _order.icebergQty           = Number.parseFloat(_order.icebergQty);
        if (_order.status == undefined) {
            _order.status = 'NEW';
        }
        return _order; 
    },
    setOpenOrders: function(_openOrders) {
        for (var i = 0; i < _openOrders.length; i++) {
            _openOrders[i] = this.parseOrder(_openOrders[i]);            
        }; 
        this.open_orders = _openOrders;
    },
    market: async function(symbol,amount,type = 'BUY') {
        let _order = await this.exchange.order({
            symbol: symbol,
            side: type,
            quantity: amount,
            type: 'MARKET',
        }).catch(error => { 
            console.log(error);
            // this.client.logger.error(error);
            return false;
        });
        return _order;
    },
    //ERROR CODES
    //-2010 insufficient_balance
    marketBuy: async function(symbol,amount) {
        return await this.market(symbol,amount,'BUY');
    },
    marketSell: async function(symbol,amount) {
        return await this.market(symbol,amount,'SELL');
    },
    buy: async function(symbol,amount,price,signal) {
        // let promisseBuy = new Promise((resolve, reject) => {    
        console.log('BUY ORDER: ' + symbol + ' QTD: ' + amount + ' PRICE: ' + price);

        let _order = await this.exchange.order({
            symbol: symbol,
            side: 'BUY',
            quantity: amount,
            price: price,
            type: 'LIMIT',
        }).catch(error => { 
            console.log(error);
            // this.client.logger.error(error);
            return false;
        });

        _order = this.parseOrder(_order);
        _order.signal = signal;
        this.created_orders.push(_order);

        console.log(this.created_orders);

        return _order;
    },
    sell: async function(symbol,amount,price,signal,type = "STOP_LOSS_LIMIT") {
        console.log('SELL ORDER: ' + symbol + ' QTD: ' + amount + ' PRICE: ' + price);
        let _stopPrice = price;
        let _sellPrice = price;
        var options = {};
        if (type == 'STOP_LOSS_LIMIT') {
            _stopPrice = price;
            _sellPrice = price - 5;

            options = {
                symbol: symbol,
                side: 'SELL',
                quantity: amount,
                timeInForce: 'GTC',
                stopPrice: _stopPrice,
                price: _sellPrice,
                type: type,
            }

        } 
        if (type == 'LIMIT') {
            options = {
                symbol: symbol,
                side: 'SELL',
                quantity: amount,
                timeInForce: 'GTC',
                price: price,
                type: type,
            }

        }

        let _order = await this.exchange.order(options).catch(error => { 
            this.client.logger.error(error);
            return false;
        });

        _order = this.parseOrder(_order);
        _order.signal = signal;
        this.created_orders.push(_order);

        return _order;
    },
    removeOpenOrders: async function(symbol,removed = true) {
        console.log('orders.removeOpenOrders');
        console.log(this.created_orders);
        for (var index = 0; index < this.created_orders.length; index++) {
            let order = this.created_orders[index];
            console.log(order);
            if (order.symbol == symbol) {
                await this.removeOrderById(order.orderId,removed);
            }
        }
        return true;
        // console.log(this.created_orders);
    },
    removeOrderBySignal: async function(signal,removed = true) {
        for (var index = 0; index < this.created_orders.length; index++) {
            let order = this.created_orders[index];
            if (order.signal == signal) {

                let _order = await this.exchange.getOrder({
                    symbol: order.symbol,
                    orderId: order.orderId,
                });

                // let response = await this.client.getOrder(order.symbol,{ orderId: order.orderId });
                // let _order = response.data;

                if ((_order.status == 'NEW')) {
                    if (removed) {
                        this.created_orders[index].status = 'REMOVED';
                    } else {
                        this.created_orders[index].status = 'CANCELED';
                    }
                    await this.cancel(_order.symbol,_order.orderId);
                }
            }
        }
        return true;
    },
    removeOrderById: async function(orderId,removed = true) {
        console.log('removeOrderById: ' + orderId);
        for (var index = 0; index < this.created_orders.length; index++) {
            let order = this.created_orders[index];
            if (order.orderId == orderId) {

                let _order = await this.exchange.getOrder({
                    symbol: order.symbol,
                    orderId: order.orderId,
                });

                // let _order = await this.exchange.orderStatus(order.symbol, order.orderId); 
                if ((_order.status == 'NEW')) {
                    if (removed) {
                        this.created_orders[index].status = 'REMOVED';
                    } else {
                        this.created_orders[index].status = 'CANCELED';
                    }
                    await this.cancel(_order.symbol,_order.orderId);
                }
            }
        }
        return true;
    },
    checkOpenOrders: async function() {
        let _changedOrders = [];
        for (var index = 0; index < this.created_orders.length; index++) {
            let order = this.created_orders[index];
            console.log(order);
            this.created_orders[index].statusChanged = false;
            if ((order.status != 'REMOVED') && (order.status != 'CANCELED') && (order.status != 'FILLED')) {

                let orderStatus = await this.exchange.getOrder({
                  symbol: order.symbol,
                  orderId: order.orderId,
                });

                console.log(orderStatus);

                if (orderStatus.status != order.status) {
                    order.status = orderStatus.status;
                    order.statusChanged = true;
                    this.created_orders[index] = order;
                    _changedOrders.push(this.created_orders[index]);

                    console.log("CHANGED:");
                    console.log(_changedOrders);
                }
            }
        }
        return _changedOrders;
    },
    
    cancel: async function(symbol,_orderId) {
        console.log('cancelOrder:' + symbol + ' - ' + _orderId);
        return await this.exchange.cancelOrder({ symbol: symbol, orderId: _orderId });
    },

}

module.exports = orders;
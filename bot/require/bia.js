
const coin = require('./coin')
const TelegramBot = require('node-telegram-bot-api');
let moment = require('moment')
let timer = require("../node_modules/moment-timer/lib/moment-timer.js")
const fs = require('fs');
const path = require('path');
const bot = require('./bot.js');
const cron = require('node-cron');

const { Console } = require('console');
const Binance = require('binance-api-node').default
const axios = require('axios');
const { resolve } = require('path');

require('events').EventEmitter.prototype._maxListeners = 30;
require('events').defaultMaxListeners = 30;


const bia = {
    
    options: {
/*
      OPTIONS ARE LOADED FROM CONFIGS.      
*/
    }, 
    orders: require('./orders.js'),

    trades: require('./trades'),

    intervals: [],

    coinPrice: 0,
    bnbPrice: 592,
    paused: true,
    precision: 4,

    totalamount: 0,
    avgPrice: 0,

    purchased: false,
    symbol: 'BTCBRL',
    status: 'none',

    test: false,
    testDecision: 'buy',

    qtdWaitSell : 0,
    qtdWaitBuy: 0,
    qtdWaitStopLoss: 0,

    log: function(msg) {
        if (process.env.DEBUG) {
            console.log(msg);
        }
    },
    
    create: async function(_options) {
        console.log('bia.create()');
        _options.id = 1;
        _options.user_id = 1;

        bia.config(_options);      
        bia.sendMessage('BOT CREATED!');
        bia.startDate = moment().subtract(1,'day');

        bia.load('default_' + bia.symbol);

        bia.totalamount = 0;
        bia.avgPrice = 0;

        bia.setupTimers(_options);
        bia.runTimer1();
    },
    config: async function(_options) {
        console.log('bia.config()');
        if (_options != undefined) {
            bia.options = _options;
        }

        let exchange = Binance({
            apiKey: process.env.BINANCE_APIKEY, 
            apiSecret: process.env.BINANCE_SECRET,
        })

        bia.exchange = exchange;
        bia.orders.setExchange(exchange,'binance');
        bia.trades.setExchange(exchange,'binance');

        // var client = new Spot(process.env.BINANCE_APIKEY, process.env.BINANCE_SECRET)
        // bia.orders.setClient(client);

        bot.config(_options.user_id,_options,bia);
    },
    setupTimers: async function(_options) {
        bia.log('bia.setupTimers()');
        if (bia.cron1 != undefined) { bia.cron1.stop(); }
        if (bia.cron2 != undefined) { bia.cron2.stop(); }
        if (bia.cron3 != undefined) { bia.cron3.stop(); }
        bia.cron1 = await cron.schedule(_options.timer1, async () => this.runTimer1());
        bia.cron2 = await cron.schedule(_options.timer2, async () => this.runTimer2());
        bia.cron3 = await cron.schedule(_options.timer3, async () => this.runTimer3());
    },
    runTimer1: async function( ) {
        bia.log('bia.runTimer1()');
        if (bia.paused == false) {
           await bia.checkOpenOrders();
           await bia.callStatus();
           await bia.save('default_' + bia.symbol);
       } else {
           console.log("PAUSED");
       }
    },
    runTimer2: async function() {
       bia.log('bia.runTimer2()');
       await bia.statusNone();
    },
    runTimer3: async function() {
       bia.log('bia.runTimer3()');
       bot.cmdStatus();
    },
    getAIDecision: async function(_symbol) {
        bia.log('bia.getAIDecision()');
        if (bia.test == false) {

            // let _options = {};
            // _options.url = process.env.AI_API_URL + '/?symbol=' + _symbol;
            // _options.method = 'GET';
            // return axios(_options);

            return await bia.getCalculatedDecision(bia.symbol,bia.averageBuyPrice);
        } else {
            return bia.testDecision;
        }
    },
    getCalculatedDecision: async function(symbol,averageBuyPrice) {
        const endTime = Date.now();
        const startTime = endTime - 24 * 60 * 60 * 1000; // 3 horas em milissegundos

        const candles = await bia.exchange.candles({
            symbol: symbol,      
            interval: '15m',     
            startTime: startTime,
            endTime: endTime
        });
        

        var closeNumbers = [];
        var openNumbers = [];
        var highNumbers = [];
        var lowNumbers = [];

        var highest = 0;
        var lowest = candles[0].high * 100;

        for (var i in candles) {
            closeNumbers.push(parseFloat(candles[i].close));
            openNumbers.push(parseFloat(candles[i].open));
            highNumbers.push(parseFloat(candles[i].high));
            lowNumbers.push(parseFloat(candles[i].low));

            if (candles[i].high > highest) {
                highest = parseFloat(candles[i].high);
            }

            if ((candles[i].low) < lowest) {
                lowest = parseFloat(candles[i].low);
            }

            console.log(i + ' - ' + candles[i].close);
        }

        var average = (highest + lowest) / 2;
        console.log('Highest: ' + highest);
        console.log('Lowest: ' + lowest);
        console.log('Average: ' + average);

    
        const fatorComparacao = 0.999;
        var decision = 'wait';
        // const resultado = detectUpAndDownTrends(closeNumbers, fatorComparacao);
        const trends = bia.detectTrends(closeNumbers,fatorComparacao);
        const resultado = bia.groupTrends(trends);
        console.log(resultado);

        if (resultado != false) {
            let penultimo = resultado[resultado.length - 2];
            let ultimo = resultado[resultado.length - 1];

            
            if (ultimo.trend == 'uptrend') {

                var fibonacciLevels = bia.calculateFibonacciLevelsWithTrend(penultimo.startValue,penultimo.endValue);
                console.log(`Fibonacci levels between:`, fibonacciLevels);

                if (ultimo.endValue >= fibonacciLevels.levels[0]) {
                    decision = 'sell'
                }

            } else {
                if (ultimo.count >= 2) {

                    var fibonacciLevels = bia.calculateFibonacciLevelsWithTrend(penultimo.startValue,penultimo.endValue);
                    console.log(`Fibonacci levels between:`, fibonacciLevels);

                    if (ultimo.endValue <= fibonacciLevels.levels[0]) {
                        decision = 'buy'
                    }
                }
            }
        }
        console.log(decision);
        return decision;
    },
    detectTrends: function(numbers, factor) {
        if (numbers.length < 2) {
            return []; // Sem dados suficientes para determinar a tendência
        }
    
        const trends = []; // Array para armazenar a tendência
        let currentTrend = null; // Tendência atual: "uptrend", "downtrend" ou null
    
        for (let i = 1; i < numbers.length; i++) {
            const diff = numbers[i] - numbers[i - 1];
            const significantChange = Math.abs(diff) > Math.abs(numbers[i - 1] * (1 - factor));
    
            // console.log(Math.abs(diff) + ' - ' + Math.abs(numbers[i - 1] * (1 - factor)));
            // console.log(significantChange);
            const valor = numbers[i];
    
            if (significantChange) {
                if (diff > 0) {
                    currentTrend = "uptrend";
                } else if (diff < 0) {
                    currentTrend = "downtrend";
                }
            }
            trends.push({ trend: currentTrend, valor: valor });
        }
    
        return trends;
    },
    groupTrends: function(data) {
        const groupedTrends = [];
        let currentGroup = null;
    
        data.forEach((item, index) => {
            if (!currentGroup || currentGroup.trend !== item.trend) {
                // Push the previous group to the result if it exists
                if (currentGroup) {
                    currentGroup.endValue = data[index - 1].valor;
                    groupedTrends.push(currentGroup);
                }
                // Start a new group
                currentGroup = {
                    trend: item.trend,
                    startValue: item.valor,
                    count: 1, // Initialize count
                };
            } else {
                // Increment count if the trend continues
                currentGroup.count++;
            }
        });
    
        // Add the last group to the result
        if (currentGroup) {
            currentGroup.endValue = data[data.length - 1].valor;
            groupedTrends.push(currentGroup);
        }
    
        return groupedTrends;
    },
    calculateFibonacciLevelsWithTrend: function(start, end) {
        // Detect trend
        const trend = end > start ? "uptrend" : "downtrend";
    
        // Calculate Fibonacci levels
        const difference = Math.abs(end - start);
        const fibonacciLevels = [0.48, 0.3];
    
        // Determine levels based on trend
        const levels = fibonacciLevels.map(level => {
            return trend === "uptrend"
                ? start + level * difference // Levels move up
                : start - level * difference; // Levels move down
        });
    
        return {
            trend,
            levels
        };
    },
    syncPrices: async function() {
        bia.log('bia.syncPrices()');
        const promisseSync = new Promise((resolve, reject) => {
            bia.exchange.prices().then( (_prices) => {
                bia.coinPrice = coin.format(Number.parseFloat(_prices[this.symbol]),2);
                bia.bnbPrice = coin.format(Number.parseFloat(_prices['BNBBUSD']),bia.precision);
                coin.setCoinPrice(bia.coinPrice,bia.bnbPrice);
                resolve({ coinPrice : bia.coinPrice, bnbPrice: bia.bnbPrice } );
            }).catch( (error) => {
                console.log(error);
                reject(error);
            });
        });
        return promisseSync;
    },
    syncBalance: async function() {
        bia.log('bia.syncBalance()');
        const promisseSyncBalance = new Promise( async (resolve, reject) => {

            let accountInfo = await bia.exchange.accountInfo();
            for (var i in accountInfo.balances) {
                
                var currentCoin = accountInfo.balances[i];
                if (currentCoin.asset == 'BUSD') {
                    bia.busd = coin.format(Number.parseFloat(currentCoin.free),2);
                }
                if (currentCoin.asset == 'BTC') {
                    bia.btc = coin.format(Number.parseFloat(currentCoin.free),6);
                }
                if (currentCoin.asset == 'BRL') {
                    bia.brl = coin.format(Number.parseFloat(currentCoin.free),2);
                }
                if (currentCoin.asset == 'ETH') {
                    bia.eth = coin.format(Number.parseFloat(currentCoin.free),2);
                }
            }

            resolve({ busd: bia.busd, btc: bia.btc , eth: bia.eth, brl : bia.brl , balances: accountInfo.balances});
        });
        return promisseSyncBalance;
    },
    addRunTimer: function(_id,_duration,_callBack) {
        bia.log('bia.addRunTimer()');
        if (bia.intervals[_id] != undefined) {
            bia.intervals[_id].stop();
        }
        bia.intervals[_id] = moment.duration(_duration, "minutes").timer({loop: true,}, _callBack );
    },
    setOption(name, value) {
        bia.log('bia.setOption()');
        console.log(name + ":" + value);
        if ((name == 'timer1') || (name == 'timer2') || (name == 'timer3'))  {
            eval("bia.options." + name + " = '" + value + "';");
            bia.setupTimers(bia.options);
        } else {
            eval("bia.options." + name + " = Number.parseFloat(" + value + ");");
        }
    },
    sendMessage: function(msg,opts = { "parse_mode": "HTML" }) {
        bia.log('bia.sendMessage()');
        if (bot.telegram != null) {
            bot.telegram.sendMessage(process.env.TELEGRAM_CHATID,msg,opts);
        } else {
            console.log(msg);
        }
    },
    calculate: function() {
        bia.log('bia.calculate()');
        let _capital = bia.options.capital;
        if (bia.options.auto_capital == 1) {
            if (bia.symbol == 'BTCBUSD') {
                _capital = coin.format(Number.parseFloat(bia.busd) / bia.options.auto_capital_divisor,2);
            }
            if (bia.symbol == 'ETHBRL') {
                _capital = coin.format(Number.parseFloat(bia.brl) / bia.options.auto_capital_divisor,2);
            }
            if (bia.symbol == 'BTCBRL') {
                _capital = coin.format(Number.parseFloat(bia.brl) / bia.options.auto_capital_divisor,2);
            }
            bia.setOption('capital',_capital);
        }
        // if (bia.symbol == 'BTCBUSD') {
        //     if (_capital >= bia.busd) {
        //         _capital = bia.busd;
        //     }
        // }
        // if (bia.symbol == 'ETHBRL') {
        //     if (_capital >= bia.eth) {
        //         _capital = bia.eth;
        //     }
        // }
        coin.setCapital(_capital);
        coin.setCoinPrice(bia.buyPrice);
        bia.sellPrice = coin.format(coin.calculateMinValueForPrice(bia.buyPrice,(bia.options.proffit),0));
        bia.stopLossPrice1 = coin.format(coin.calculateMinValueForPrice(bia.buyPrice,(bia.options.stop_loss1)),0); // APORTA DUAS VEZES O VALOR INICIAL E TENTA VENDER PELA FIBONACCI 0,382
        bia.stopLossPrice2 = coin.format(coin.calculateMinValueForPrice(bia.buyPrice,(bia.options.stop_loss2)),0); // CANCELA E TENTA VENDER PELO PREÇO QUE COMPROU SEM PAGAR TAXAS.
        bia.stopLossPrice3 = coin.format(coin.calculateMinValueForPrice(bia.buyPrice,(bia.options.stop_loss3)),0); // TENTA VENDER PELO PREÇO ATUAL SEM PAGAR TAXAS.
        bia.stopLossPrice4 = coin.format(coin.calculateMinValueForPrice(bia.buyPrice,(bia.options.stop_loss4)),0); // MARKET SELL E QUARENTENA PORQUE FUDEU.
        
        bia.amount = coin.getCoinAmount(bia.options.capital,bia.buyPrice,bia.precision);

    },
    createOrder: async function(signal,type,symbol,amount,price,_orderType = "STOP_LOSS_LIMIT") {
        bia.log('bia.createOrder()');
        let _order = false;
        if (type == 'sell') {
            _order = await bia.orders.sell(symbol,amount,price,signal,_orderType);
        }
        if (type == 'buy') {
            _order = await bia.orders.buy(symbol,amount,price,signal);
        }
        return _order;
    },
    createSellOrder: async function(coinPrice,sell_type) {
        bia.log('bia.createSellOrder()');
        if (bia.purchased == true) {
            bia.orders.removeOrderBySignal('sell_order');
            let _type = "LIMIT";

            if (sell_type == 'normal') { //VENDE PELO PREÇO MÉDIO DE COMPRA OU PELO PREÇO ATUAL SE FOR MAIOR.

                bia.status = 'wait_sell';
                
                // if ((coinPrice - bia.avgPrice) <= 150) {
                //     bia.sellOrderPrice = bia.avgPrice + 50;
                // } else {
                //     bia.sellOrderPrice = ((coinPrice + bia.avgPrice) / 2);
                // }

                // bia.sellOrderPrice = bia.coinPrice - bia.
                _type = "STOP_LOSS_LIMIT";
                
            }
            if (sell_type == 'stop_loss_2') { //VENDE PELO PREÇO MÉDIO DE COMPRA OU PELO PREÇO ATUAL SE FOR MAIOR SEM PAGAR TAXA NENHUMA.
                bia.status = 'wait_stop_loss_2';
                bia.sellOrderPrice = bia.avgPrice;
                if (coinPrice > bia.avgPrice) {
                    bia.sellOrderPrice = coinPrice;
                }
            }
            if (sell_type == 'stop_loss_3') { //VENDE PELO PREÇO QUE ESTÁ ATUALMENTE SEM PAGAR TAXA.
                bia.status = 'wait_stop_loss_3';
                bia.sellOrderPrice = coinPrice + 10;
            }

            if (sell_type == 'stop_loss4') { // MARKET VENDE PELO PREÇO QUE ESTÁ ATUALMENTE PAGANDO TAXA.
                bia.sellOrderPrice = coinPrice;

                let _order = await bia.exchange.order({
                    symbol: bia.symbol,
                    side: 'SELL',
                    quantity: coin.format(bia.totalamount,bia.precision),
                    type: 'MARKET',
                });
                console.log(_order);
                // let _order = await bia.exchange.marketSell(bia.symbol, coin.format(bia.totalamount,bia.precision));
                bia.status = 'none';
                bia.qtdWaitSell = 0;
                bia.sendMessage(bot.msgHasSold(_order),{ "parse_mode": "HTML" });
            } else {
                
                bia.qtdWaitSell = 0;
                return await bia.createOrder('sell_order','sell',bia.symbol,coin.format(bia.totalamount,bia.precision),coin.format(bia.sellOrderPrice,2),_type);
            }
            
        }
    },
    checkStopLoss: async function() {
        bia.log('bia.checkStopLoss()');
        if (bia.purchased == true) {
            if (bia.coinPrice <= bia.stopLossPrice4) { 
                await bia.createSellOrder(bia.coinPrice,'stop_loss_4');
                // bot.cmdPause();
            } else {
                //STOP LOSS 3
                if ((bia.coinPrice <= bia.stopLossPrice3) && (bia.status != 'wait_stop_loss_3')) { 
                    await bia.createSellOrder(bia.coinPrice,'stop_loss_3');
                } else {
                    //STOP LOSS 2
                    if ((bia.coinPrice <= bia.stopLossPrice2) && (bia.status != 'wait_stop_loss_2')) {
                        bia.sendMessage('TRYING TO SELL STOP LOSS 2');
                        await bia.createSellOrder(bia.coinPrice,'stop_loss_2');
                    }
                }
            }  
        }
    },
    checkOpenOrders: async function() {
        bia.log('bia.checkOpenOrders()');
        let results = await bia.orders.checkOpenOrders();
        console.log(results);
        // console.log(results.length);
        for (var i = 0; i < results.length; i++) {
            let _order = results[i];
            console.log(_order);
            await bia.fire(_order.signal,_order);
        }
    },
    callStatus: async function(_newStatus) {
        bia.log('bia.callStatus()');
        if (bia.paused == false) {
            if (_newStatus != undefined) {
                bia.status = _newStatus;
            }
            await bia.syncPrices();
            await bia.checkStopLoss();
            await bia.statusWaitBuy();
            await bia.statusWaitSell();
            await bia.statusCreateBuyOrder();
            await bia.statusCreateSellOrder();
        }
    },
    fire: async function(signal,order) { 
        bia.log("bia.fire():" + signal + ":" + order.status);

        if (order.status == 'FILLED') {
            if (order.side == 'BUY') {

                //CALCULATE AVERAGE BUY PRICE BEFORE INCRESING TOTALAMMOUNT.
                bia.avgPrice = coin.format((((bia.avgPrice * bia.totalamount) + (order.origQty * order.price)) / (order.origQty + bia.totalamount)),2);
                bia.totalamount = bia.totalamount + order.origQty;

                console.log('AVGPRICE');
                console.log(bia.avgPrice);
                
            }
            if (order.side == 'SELL') {
                bia.totalamount = bia.totalamount - order.origQty;
            }
        }
        if (signal == 'buy_order_2') {
            if (order.status == 'FILLED') {

                //REMOVE A ORDEM DE VENDA ATUAL SE ELA EXISTIR.
                await bia.orders.removeOrderBySignal("sell_order");
                await bia.sendMessage(bot.msgHasBought(order));
                
                //RECALCULATE SELL PRICE
                bia.sellPrice = coin.format(coin.calculateMinValueForPrice(bia.avgPrice,(bia.options.proffit),2));
                await bia.callStatus('create_sell');
            }
            if (order.status == 'CANCELED') {

                await bia.orders.removeOrderBySignal('buy_order');
                await bia.sendMessage('<b>ORDEM DE COMPRA 2 CANCELADA.</b>');
                await bia.callStatus('none');
            }
        }
        if (signal == 'buy_order') {
            if (order.status == 'FILLED') {
                bia.purchased = true;
                await bia.callStatus('create_sell');
                await bia.sendMessage(bot.msgHasBought(order));
            }
            if (order.status == 'CANCELED') {
                await bia.orders.removeOrderBySignal('buy_order_2');
                await bia.sendMessage('BUY ORDER REMOVED.');
                await bia.callStatus('none');  
            }
            if (order.status == 'REMOVED') {
                await bia.sendMessage('BUY ORDER REMOVED.');
            }
        }
        if (signal == 'sell_order') {
            // if ((order.status == 'FILLED') || (order.status == 'CANCELED')) {
            if (order.status == 'FILLED') {
                bia.purchased = false;

                bia.totalamount = 0;
                bia.avgPrice = 0;

                bia.callStatus('none');
                bia.sendMessage(bot.msgHasSold(order));
                bia.orders.removeOpenOrders(bia.symbol);
            }
            if (order.status == 'CANCELED') {
                await bia.sendMessage('SELL ORDER CANCELLED.');
            }
            if (order.status == 'REMOVED') {
                await bia.sendMessage('SELL ORDER REMOVED.');
            }
        }
    },
    statusCreateSellOrder: async function() {
        bia.log('bia.statusCreateSellOrder()');
        if (bia.purchased == true) {
            if (bia.status == 'create_sell') {

                let decision = await bia.getAIDecision(bia.symbol);
                if (decision == 'sell') {  
                        // await bia.createSellOrder(bia.coinPrice,'stop_loss_4');
                    // }
                // if ((bia.coinPrice >= bia.avgPrice) && (bia.coinPrice >= bia.sellPrice)) {

                    bia.sellOrderPrice = coin.format(((bia.coinPrice + bia.avgPrice) / 2),2);

                    bia.status = 'wait_sell';
                    bia.qtdWaitSell = 0;

                    //NAO PERDE MAIS, PODE REMOVER A SEGUNDA COMPRA.
                    if (bia.options.auto_capital_divisor > 1) {
                        await bia.orders.removeOrderBySignal('buy_order_2');
                    }

                    await bia.createOrder('sell_order','sell',bia.symbol,coin.format(bia.totalamount,bia.precision),coin.format(bia.sellOrderPrice,0),"STOP_LOSS_LIMIT");
                    await bia.sendMessage('<b>CREATING SELL ORDER</b>');
                    
                } else {
                    console.log('WAITING DECISION SELL: ' + bia.sellPrice + ' - ' + bia.coinPrice);
                }
            }
        }
    },
    statusWaitSell: async function () {
        bia.log('bia.statusWaitSell()');
        if (bia.status == 'wait_sell') {
            bia.qtdWaitSell = bia.qtdWaitSell + 1;

            let newSellOrderPrice = coin.format(((bia.coinPrice + bia.buyPrice) / 2),0);
            if ((bia.coinPrice - bia.avgPrice) <= 30) {
                newSellOrderPrice = bia.avgPrice + bia.options.sell_difference;
            } else {
                newSellOrderPrice = ((bia.coinPrice + bia.avgPrice) / 2);
            }

            if (newSellOrderPrice > bia.sellOrderPrice) {

                bia.sellOrderPrice = newSellOrderPrice

                //RECREATING SELL ORDER
                await bia.orders.removeOrderBySignal('sell_order');
                await bia.createOrder('sell_order','sell',bia.symbol,coin.format(bia.totalamount,bia.precision),newSellOrderPrice,"STOP_LOSS_LIMIT");
            }

            // if (bia.qtdWaitSell >= bia.options.sell_max_wait) {
            //     await bia.orders.removeOrderBySignal('sell_order');
            //     bia.qtdWaitSell = 0;
            // }
        }
        if ((bia.status == 'wait_stop_loss_2') || (bia.status == 'wait_stop_loss_3')) {
            bia.qtdWaitStopLoss = bia.qtdWaitStopLoss + 1;

            if (bia.qtdWaitStopLoss >= bia.options.stop_loss_max_wait) {
                bia.qtdWaitStopLoss = 0;
                
                let _nextStatus = 'stop_loss3';
                if (bia.status == 'wait_stop_loss_3') { _nextStatus = 'stop_loss_4'; }

                await bia.createSellOrder(bia.coinPrice,_nextStatus);
            }
        }

    },
    statusCreateBuyOrder: async function() {
        bia.log('bia.statusCreateBuyOrder()');
        if ((bia.purchased == false) && (bia.status == 'create_buy') && (bia.status != 'wait_buy')) {
            await bia.syncBalance();

            bia.buyPrice = bia.coinPrice - bia.options.buy_difference;
            bia.calculate();

            bia.status = 'wait_buy';
            bia.qtdWaitBuy = 0;
            bia.avgPrice = 0;

            let _order = await bia.createOrder('buy_order','buy',bia.symbol,bia.amount,bia.buyPrice);

            let _order2;

            if (bia.options.auto_capital_divisor > 1) {
                _order2 = await bia.createOrder('buy_order_2','buy',bia.symbol,bia.amount,bia.stopLossPrice1);
            }

            bia.sendMessage('<b>CREATING BUY ORDERS.</b>' + JSON.stringify(_order) + '' + JSON.stringify(_order2));
        }
    },
    statusWaitBuy: async function () {
        bia.log('bia.statusWaitBuy()');
        if (bia.status == 'wait_buy') {
            bia.qtdWaitBuy = bia.qtdWaitBuy + 1;

            if (bia.qtdWaitBuy >= bia.options.buy_max_wait) {
                await bia.orders.removeOrderBySignal('buy_order');
                await bia.orders.removeOrderBySignal('buy_order_2');
                bia.qtdWaitBuy = 0;
                bia.status = 'create_buy';
            }
        }
    },
    statusNone: async function() {
        bia.log('bia.statusNone()');
        if ((bia.paused == false) &&  (bia.purchased == false) && (bia.status == 'none')) {
            let decision = await bia.getAIDecision(bia.symbol);
            bia.lastAIdecision = decision;
            if (decision == 'buy') {  
                bia.callStatus('create_buy');  
            }
        }
        // if ((bia.paused == false) &&  (bia.purchased == true)) {
        //     let response = await bia.getAIDecision(bia.symbol);
        //     let decision = response.data;
        //     bia.lastAIdecision = decision.result;
        //     if (decision.result == 'sell') {  
        //         await bia.createSellOrder(bia.coinPrice,'stop_loss_4');
        //     }
        // }
    },
    save: function(_name) {
        bia.log('bia.save()');
        if ((_name != '') && (_name != undefined)) {
            let jsonObj = this.options;

            jsonObj.coinPrice = this.coinPrice;
            jsonObj.bnbPrice = this.bnbPrice;
            // jsonObj.paused = this.paused;
            jsonObj.amount = this.amount;
            // jsonObj.totalamount = this.totalamount;
            // jsonObj.avgPrice = this.avgPrice;
            jsonObj.purchased = this.purchased;
            jsonObj.symbol = this.symbol;
            jsonObj.status = this.status;
            jsonObj.qtdWaitSell = this.qtdWaitSell;
            jsonObj.qtdWaitBuy = this.qtdWaitBuy;
            jsonObj.qtdWaitStopLoss = this.qtdWaitStopLoss;

            jsonObj.sellPrice = this.sellPrice;
            jsonObj.stopLossPrice1 = this.stopLossPrice1;
            jsonObj.stopLossPrice2 = this.stopLossPrice2;
            jsonObj.stopLossPrice3 = this.stopLossPrice3;
            jsonObj.stopLossPrice4 = this.stopLossPrice4;


            // jsonObj.orders = this.orders.getOrders();

            // console.log(jsonObj);

            var jsonContent = JSON.stringify(jsonObj);
            let _path =  process.env.FOLDER_PATH + '/configs/saved/';

            // var  = this;

            fs.writeFile( _path + _name + ".json", jsonContent, 'utf8', function (err) {
                if (err) {
                    bia.sendMessage('ERROR SAVING CONFIG: ' + _name);
                    return console.log(err);
                }
            });
        } else {
            bia.sendMessage('/SAVE [NAME]');
        }
    },
    load: function(_name) {
        bia.log('bia.load(' + _name + ')'); 
        if ((_name != '') && (_name != undefined)) {

            var currentPath = process.cwd();
            
            let _path = currentPath + '/configs/saved/';
            let conf = require(_path + _name + '.json');

            if (this.options = conf) {

                if (conf.coinPrice != undefined) {

                    this.coinPrice = conf.coinPrice;
                    this.bnbPrice = conf.bnbPrice;
                    // this.paused = conf.paused;
                    this.amount = conf.amount;
                    // this.totalamount = conf.totalamount;
                    // this.avgPrice = conf.avgPrice;
                    this.purchased = conf.purchased;
                    this.symbol = conf.symbol;
                    this.status = conf.status;
                    this.qtdWaitSell = conf.qtdWaitSell;
                    this.qtdWaitBuy = conf.qtdWaitBuy;
                    this.qtdWaitStopLoss = conf.qtdWaitStopLoss;

                    this.sellPrice = conf.sellPrice;
                    this.stopLossPrice1 = conf.stopLossPrice1;
                    this.stopLossPrice2 = conf.stopLossPrice2;
                    this.stopLossPrice3 = conf.stopLossPrice3;
                    this.stopLossPrice4 = conf.stopLossPrice4;

                }

                // if (conf.orders != undefined) {
                //     this.orders.setOrders(conf.orders.created_orders,conf.orders.open_orders);
                // }
               
                // this.orders.getOrders();
                console.log(conf);

                bia.sendMessage('LOAD: ' + _name);
            } else {
                bia.sendMessage('ERROR LOADING: ' + _name);
            }
            
        } else {
            bia.sendMessage('/LOAD [NAME]');
        }
    }

}

module.exports = bia;

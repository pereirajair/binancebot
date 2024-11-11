const TelegramBot = require('node-telegram-bot-api');
const bia = require('./bia');
const coin = require('./coin')

const bot = {

    bia: null,
    telegram: null,
    options: null,
    user_id: null,

    config: function(user_id,options,bia) {
        this.options = options;
        this.bia = bia;
        this.user_id = user_id;
        this.telegram = new TelegramBot(process.env.TELEGRAM_TOKEN, {polling: true});
        this.registerCommands();
    },

    checkFromId: function(msg) {
        if (msg.from.id != process.env.TELEGRAM_CHATID) {
            this.telegram.sendMessage(msg.chat.id,'USER NOT AUTORIZED',{} ); 
            return false;
        } else {
            return true;
        }
    },
    getOptions: function(_commands) {
        let _options = {
            "reply_markup": {
                "keyboard": _commands
            },
            "parse_mode": "HTML" 
        };
        return _options;
    },
    getHelpCommands: function() {

        let _commands = [];
        _commands[0] = [];
        // _commands[0].push('/start');
        _commands[0].push('/play');
        _commands[0].push('/pause');
        _commands[0].push('/run');
        _commands[0].push('/restart');
        _commands[1] = [];
        
        _commands[1].push('/get');
        _commands[1].push('/set');
        
        _commands[2] = [];
        _commands[2].push('/ls');
        _commands[2].push('/save');
        _commands[2].push('/load');

        _commands[3] = [];
        _commands[3].push('/status');
        _commands[3].push('/proffit');
        _commands[3].push('/help');
        
        return _commands;
    },

    msgHasBought: function(order) {
        let _message = '';
        let _capital = coin.format(order.origQty * order.price,2);
        if (order.type != 'MARKET') {
            _message = '<B>PURCHASED</B>\n\n<b>CAPITAL:</b>' + _capital + '\n<B>AMOUNT</B>: ' + order.origQty + '\n<B>PRICE</B>:' + order.price + '\n\n<B>MIN SELL PRICE:</B>: ' + this.bia.sellPrice + '\n<B>STOPLOSS1</B>: ' + this.bia.stopLossPrice1+ '\n<B>STOPLOSS2</B>: ' + this.bia.stopLossPrice2+ '\n<B>STOPLOSS3</B>: ' + this.bia.stopLossPrice3+ '\n<B>STOPLOSS4</B>: ' + this.bia.stopLossPrice4;
        } else {
            _message = '<B>PURCHASED</B>\n\n<b>CAPITAL:</b>' + order.cummulativeQuoteQty + '\n<B>AMOUNT</B>: ' + order.origQty + '\n<B>PRICE</B>: MARKET';
        }
        return _message;
    },
    msgHasSold: function(order) {
        let _message = '';
        let _capital = coin.format(order.origQty * order.price,2);
        _message = '<B>SOLD</B>\n\n<b>CAPITAL:</b>' + _capital + '\nAMOUNT: ' + order.origQty + '\nPRICE:' + order.price + '\nTYPE: ' + order.type;
        return _message;
    },

    msgStatus: function() {
        let _message = '';
        if (this.bia.paused) { _message = _message + '<b>PAUSED</b>: TRUE\n'; } else { _message = _message + '<b>PAUSED</b>: FALSE\n'; }
        _message = _message + '<b>STATUS</b>: ' + this.bia.status + '\n';
        if (this.bia.purchased) { 
            _message = _message + '<b>PURCHASED</b>: TRUE\n';
            if (this.bia.amount != undefined) {
                _message = _message + '<b>AMOUNT</b>: ' + this.bia.amount + '\n';
            }
            if (this.bia.avgPrice != undefined) {
                _message = _message + '<b>AVERAGE PRICE</b>: ' + this.bia.avgPrice + '\n';
            }
            if (this.bia.sellPrice != undefined) {
                _message = _message + '<b>MIN SELL PRICE</b>: ' + this.bia.sellPrice + '\n';
            }
            if (this.bia.stopLossPrice1 != undefined) {
                _message = _message + '<b>STOPLOSS1</b>: ' + this.bia.stopLossPrice1 + '\n';
            }
            if (this.bia.stopLossPrice2 != undefined) {
                _message = _message + '<b>STOPLOSS2</b>: ' + this.bia.stopLossPrice2 + '\n';
            }
            if (this.bia.stopLossPrice3 != undefined) {
                _message = _message + '<b>STOPLOSS3</b>: ' + this.bia.stopLossPrice3 + '\n';
            }
        } else { 
            _message = _message + '<b>PURCHASED</b>: FALSE\n'; 
        }
        if (this.bia.lastAIdecision != undefined) {
            _message = _message + '<b>DECISION</b>: ' + this.bia.lastAIdecision + '\n';
        }
        if (this.bia.options.auto_capital == 1) {
            _message = _message + '<b>CAPITAL</b>: AUTO\n'; 
        } else {
            _message = _message + '<b>CAPITAL</b>: ' + this.bia.options.capital + '\n'; 
        }

        return _message;
    },

    cmdBuy: async function(capital,orderType = "TAKE_PROFIT_LIMIT") {
        await this.bia.syncBalance();
        await this.bia.syncPrices();

        // if (this.bia.symbol == 'BTCUSDT') {
        //     if (capital > this.bia.busd) {
        //         capital = this.bia.busd;
        //     }
        // }
        let _precision = 5;
        if (this.bia.symbol == 'ETHBRL') {
        //     if (capital > this.bia.brl) {
        //         capital = this.bia.brl;
        //     }
            _precision = 2;
        }
        
        
        let _price = this.bia.coinPrice - this.bia.options.buy_difference;
        let _amount = coin.format(coin.getCoinAmount(Number.parseFloat(capital),_price,5),_precision);

        if (orderType == "TAKE_PROFIT_LIMIT") {
            await this.bia.createOrder('extra_buy_order','buy',this.bia.symbol,_amount,_price);
            this.bia.sendMessage('<b>CRIANDO ORDEM DE COMPRA<b>\n\nCAPITAL</b>:' + capital + '\n<b>AMOUNT</b>:' + _amount+ '\n<b>PRICE</b>:' + _price,{ "parse_mode": "HTML" });
        } else {
            if (orderType == "MARKET") {
                let _order = await this.bia.exchange.marketBuy(this.bia.symbol, _amount);
                console.log(_order);
                this.bia.sendMessage(this.msgHasBought(_order,{ "parse_mode": "HTML" }));
            }
        }
    },
    cmdSell: async function(capital,orderType = "TAKE_PROFIT_LIMIT") {

        let responseBalances = await this.bia.syncBalance();
        console.log(responseBalances);
        let prices = await this.bia.syncPrices();

        let _price = this.bia.coinPrice;
        if (orderType == "TAKE_PROFIT_LIMIT") {
            _price = this.bia.coinPrice  + this.bia.options.sell_difference;
        } else {
            _price = this.bia.coinPrice - this.bia.options.stop_loss_difference;
        }
        let _amount = coin.format(coin.getCoinAmount(Number.parseFloat(capital),_price,4),4);

        // if (this.bia.symbol == 'BTCUSDT') {
        //     if (_amount > responseBalances.balances.BTC.available) {
        //         _amount = responseBalances.balances.BTC.available;
        //     }
        // }

        // if (this.bia.symbol == 'ETHBRL') {
        //     if (_amount > responseBalances.balances.ETH.available) {
        //         _amount = responseBalances.balances.ETH.available;
        //     }
        // }

        console.log(_amount);

        if (orderType != "MARKET") {
            let _order = await this.bia.createOrder('extra_sell_order','sell',this.bia.symbol,_amount,_price,orderType);
            console.warn(_order);
            this.bia.sendMessage('<b>CRIANDO ORDEM DE VENDA</b>\n\n<b>CAPITAL</b>:' + capital + '\n<b>AMOUNT</b>:' + _amount+ '\n<b>PRICE</b>:' + _price,{ "parse_mode": "HTML" });
        } else {
            let _order = await this.bia.exchange.marketSell(this.bia.symbol, _amount);
            this.bia.sendMessage(this.msgHasSold(_order),{ "parse_mode": "HTML" });
            console.log(_order);
        }
        
    },
    cmdCancel: async function(bot,msg) {
        await this.bia.orders.removeOrderBySignal('extra_buy_order');
        await this.bia.orders.removeOrderBySignal('extra_sell_order');
    },

    cmdRestart: async function(bot,msg) {
        if (this.bia.purchased == true) {
            await this.bia.orders.removeOpenOrders(this.bia.symbol);
            await this.bia.syncPrices(); 
            await this.bia.createSellOrder(this.bia.coinPrice,'stop_loss_2');
            this.bia.status = 'none';
            this.bia.totalamount = 0;
            this.bia.avgPrice = 0;
        } else {
            await this.bia.orders.removeOpenOrders(this.bia.symbol);
            this.bia.status = 'none';
            this.bia.totalamount = 0;
            this.bia.avgPrice = 0;
        }
    },


    //TELEGRAM COMMMANDS 
    cmdRunTimers: async function() {
        await this.bia.runTimer1();
        await this.bia.runTimer2();
        await this.bia.runTimer3();
    },

    cmdPause: function(bot,msg) {
        this.bia.paused = true;
        this.bia.sendMessage('BOT PAUSED.');
    },
    cmdPlay: function(bot,msg) {
        this.bia.paused = false;
        this.bia.sendMessage('BOT IS NOW RUNNING.');
    },
    cmdProffit: async function(bot,msg) {
        await this.bia.trades.syncTrades(this.bia.symbol);
        this.bia.trades.logTrades(this.bia.startDate,this.bia.symbol);
        let _text = await this.bia.trades.getTradesResumeText(this.bia.startDate,this.bia.symbol);
        this.bia.sendMessage(_text,{ parse_mode: 'HTML' }); 
    },

    cmdStatus: async function(bot,msg) {
        let response = await this.bia.getAIDecision(this.bia.symbol);
        let decision = response.data;
        this.bia.lastAIdecision = decision.result;
        console.log("AI_DECISION: " + this.bia.lastAIdecision);
        this.bia.sendMessage(this.msgStatus(),{ "parse_mode": "HTML" });
    },

    registerCommands: function () {
        var that = this;
        this.telegram.onText(/\/proffit/, function onMessageText(msg) {
            if (that.checkFromId(msg)) {
                console.log('/proffit command:');
                that.cmdProffit(that,msg);
            }

        });
        this.telegram.onText(/\/set/, function onMessageText(msg) {
            if (that.checkFromId(msg)) {
                console.log('/set command:');
                console.log(msg);

                let _options = msg.text.split(' ');

                let _name = _options[1]; 
                let _value = _options[2];

                if (_name == undefined) {
                    let _options = that.getOptions([
                        ['/set proffit','/set capital','/set auto_capital','/set auto_capital_divisor'],
                        ['/set stop_loss1','/set stop_loss2','/set stop_loss3'],
                        ['/set buy_difference','/set sell_difference','/set stop_loss_difference'],
                        ['/set buy_max_wait','/set sell_max_wait','/set stop_loss_max_wait'],
                        ['/set symbol','/set status','/set purchased'],
                        ['/set timer1','/set timer2','/set timer3']
                    ]);
                    that.bia.sendMessage('SET COMMANDS: ',_options); 
                } else {
                    if (_value != undefined) {
                        if (_name == 'purchased') {
                            if (_value == '1') {
                                that.bia.sendMessage('SET PURCHASED: TRUE'); 
                                that.bia.purchased = true;
                            } else {
                                that.bia.sendMessage('SET PURCHASED: FALSE'); 
                                that.bia.purchased = false;
                            }
                        } else {
                            if (_name == 'status') {
                                that.bia.status = _value;
                                that.bia.sendMessage('SET STATUS: ' + _value); 
                            } else {  
                                if (_name == 'symbol') {
                                    that.bia.symbol = _value;
                                    that.bia.sendMessage('SET SYMBOL: ' + _value); 
                                } else {
                                    if ((_name == 'timer1') || (_name == 'timer2') || (_name == 'timer3')) {
                                        _value = _value + " " + _options[3] + " " + _options[4]+ " " + _options[5]+ " " + _options[6];
                                        that.bia.setOption(_name,_value);
                                        that.bia.sendMessage('SET: ' + _name  +  ' = ' + _value); 
                                    } else {
                                        if (isNaN(_value)) {
                                            that.bia.sendMessage('SET: ' + _value  +  ' is not a number value.'); 
                                        } else {
                                            that.bia.setOption(_name,Number.parseFloat(_value));
                                            that.bia.sendMessage('SET: ' + _name  +  ' = ' + _value); 
                                        }
                                    }
                                    
                                }
                            }
                        }
                    } else {
                        let _values = [];
                        if (_name == 'symbol') {
                            _values = ['BTCBUSD','ETHBUSD','ETHBRL','BTCBRL'];
                        }
                        if (_name == 'proffit') {
                            _values = ['0.015','0.01','0.007','0.006','0.005','0.004','0.003','0.002'];
                        }
                        if (_name == 'capital') {
                            _values = ['100','1000','2000','3000','4000','5000','6000','7000'];
                        }
                        if (_name == 'status') {
                            _values = ['none','create_buy','create_sell','wait_buy','wait_sell','create_stop_loss1','create_stop_loss2'];
                        }
                        if ((_name == 'auto_capital') || (_name == 'purchased') || (_name == 'auto_sell')) {
                            _values = ['0','1'];
                        }
                        if ((_name == 'buy_difference') || (_name == 'sell_difference') || (_name == 'stop_loss_difference')) {
                            _values = ['30','50','100','200','300','500','1000','1500','2000'];
                        }
                        if ((_name == 'buy_max_wait') || (_name == 'sell_max_wait') || (_name == 'stop_loss_max_wait')) {
                            _values = ['60','300','600','800','1200','1600','1800'];
                        }
                        if ((_name == 'timer1') || (_name == 'timer2') || (_name == 'timer3')) {
                            _values = ['* * * * *','*/5 * * * *','*/15 * * * *','*/30 * * * *','*/45 * * * *','0 8 * * *'];
                        }
                        if (_name == 'auto_capital_divisor') {
                            _values = ['1','2','3','4','5','10','20','30'];
                        }
                        if ((_name == 'stop_loss1') || (_name == 'stop_loss2') || (_name == 'stop_loss3'))  {
                            _values = ['-0.01','-0.015','-0.02','-0.025','-0.03','-0.035','-0.04','-0.045','-0.05'];
                        }
                        let _commands = [];
                        _values.forEach(_value => {
                            let _str = '/set ' + _name + ' ' + _value;
                            _commands.push([_str]);
                        });

                        that.bia.sendMessage('/set ' + _name + ' needs a value.',that.getOptions(_commands));
                    }

                }
            }

        });
        this.telegram.onText(/\/get/, function onMessageText(msg) {
            if (that.checkFromId(msg)) {
                console.log('/set command:');
                console.log(msg);

                let _text = "<b>GET:</b> \n";
                _text = _text + '<b>purchased</b>: ' + that.bia.purchased + '\n';
                _text = _text + '<b>status</b>: ' + that.bia.status + '\n';
                _text = _text + '<b>symbol</b>: ' + that.bia.symbol + '\n';

                _text = _text + "\n<b>CAPITAL:</b> \n";
                _text = _text + '<b>capital</b>: ' + that.bia.options.capital + '\n';
                _text = _text + '<b>auto_capital</b>: ' + that.bia.options.auto_capital + '\n';
                _text = _text + '<b>auto_capital_divisor</b>: ' + that.bia.options.auto_capital_divisor + '\n';
                _text = _text + '<b>auto_sell</b>: ' + that.bia.options.auto_sell + '\n';

                _text = _text + "\n<b>PROFFIT:</b> \n";
                _text = _text + '<b>proffit</b>: ' + that.bia.options.proffit + '\n';
                _text = _text + '<b>stop_loss1</b>: ' + that.bia.options.stop_loss1 + '\n';
                _text = _text + '<b>stop_loss2</b>: ' + that.bia.options.stop_loss2 + '\n';
                _text = _text + '<b>stop_loss3</b>: ' + that.bia.options.stop_loss3 + '\n';

                _text = _text + "\n<b>BUY/SELL:</b> \n";
                _text = _text + '<b>buy_difference</b>: ' + that.bia.options.buy_difference + '\n';
                _text = _text + '<b>sell_difference</b>: ' + that.bia.options.sell_difference + '\n';
                _text = _text + '<b>stop_loss_difference</b>: ' + that.bia.options.stop_loss_difference + '\n';
                _text = _text + '<b>buy_max_wait</b>: ' + that.bia.options.buy_max_wait + '\n';
                _text = _text + '<b>sell_max_wait</b>: ' + that.bia.options.sell_max_wait + '\n';
                _text = _text + '<b>stop_loss_max_wait:</b> ' + that.bia.options.stop_loss_max_wait + '\n';
                
                _text = _text + "\n<b>TIMERS:</b> \n";
                _text = _text + '<b>timer1</b>: ' + that.bia.options.timer1 + '\n';
                _text = _text + '<b>timer2</b>: ' + that.bia.options.timer2 + '\n';
                _text = _text + '<b>timer3</b>: ' + that.bia.options.timer3 + '\n';

                let _commands = that.getHelpCommands();
                that.bia.sendMessage(_text,that.getOptions(_commands)); 
            }
        });
     
        this.telegram.onText(/\/status/, function onMessageText(msg) {
            if (that.checkFromId(msg)) {
                console.log('/status command:');
                that.cmdStatus();
            }
        });
        this.telegram.onText(/\/buy\ /, function onMessageText(msg) {
            if (that.checkFromId(msg)) {
                console.log('/buy command:');
                let _options = msg.text.split(' ');
                let _value = _options[1];
                let _type = _options[2]; 

                if ((_type == undefined) || (_type == "") || (_type == "p")) {
                    _type = "TAKE_PROFIT_LIMIT";
                }
                if ((_type == "m")) {
                    _type = "MARKET";
                }

                if (_value != undefined) {
                    if (isNaN(_value)) {
                        that.bia.sendMessage("VALUE IS NOT A NUMBER");
                    } else {
                        that.cmdBuy(_value,_type);
                    }
                } else {
                    that.bia.sendMessage("VALUE NOT INFORMED");
                }
            }
        });
        this.telegram.onText(/\/sell\ /, function onMessageText(msg) {
            if (that.checkFromId(msg)) {
                console.log('/sell command:');
                let _options = msg.text.split(' ');
                let _value = _options[1]; 
                let _type = _options[2]; 

                if ((_type == undefined) || (_type == "") || (_type == "p")) {
                    _type = "MARKET";
                }
                if ((_type == "p")) {
                    _type = "TAKE_PROFIT_LIMIT";
                }
                if ((_type == "m")) {
                    _type = "MARKET";
                }
                if ((_type == "s")) {
                    _type = "STOP_LOSS_LIMIT";
                }

                if (_value != undefined) {
                    if (isNaN(_value)) {
                        that.bia.sendMessage("VALUE IS NOT A NUMBER");
                    } else {
                        that.cmdSell(_value,_type);
                    }
                } else {
                    that.bia.sendMessage("VALUE NOT INFORMED");
                }
            }
        });
        // this.telegram.onText(/\/stoploss\ /, function onMessageText(msg) {
        //     if (that.checkFromId(msg)) {
        //         console.log('/sell command:');
        //         let _options = msg.text.split(' ');
        //         let _value = _options[1]; 

        //         if (_value != undefined) {
        //             if (isNaN(_value)) {
        //                 that.bia.sendMessage("VALUE IS NOT A NUMBER");
        //             } else {
        //                 that.bia.cmdSell(_value,"STOP_LOSS_LIMIT");
        //             }
        //         } else {
        //             that.bia.sendMessage("VALUE NOT INFORMED");
        //         }
        //     }
        // });
        this.telegram.onText(/\/cancel/, function onMessageText(msg) {
            if (that.checkFromId(msg)) {
                console.log('/cancel command:');
                that.cmdCancel(that,msg);
            }
        });

        
        this.telegram.onText(/\/pause/, function onMessageText(msg) {
            if (that.checkFromId(msg)) {
                console.log('/pause command:');
                that.cmdPause(that,msg);
            }
        });
        this.telegram.onText(/\/play/, function onMessageText(msg) {
            if (that.checkFromId(msg)) {
                console.log('/play command:');
                that.cmdPlay(that,msg);
            }
        });

        this.telegram.onText(/\/run/, function onMessageText(msg) {
            if (that.checkFromId(msg)) {
                console.log('/run command:');
                that.cmdRunTimers();  
            }
        });
        // this.telegram.onText(/\/run1/, function onMessageText(msg) {
        //     if (that.checkFromId(msg)) {
        //         console.log('/run1 command:');
        //         that.bia.cmdRunTimer1();         
        //     }
        // });
        // this.telegram.onText(/\/run2/, function onMessageText(msg) {
        //     if (that.checkFromId(msg)) {
        //         console.log('/run1 command:');
        //         that.bia.cmdRunTimer2();         
        //     }
        // });

        this.telegram.onText(/\/help/, function onMessageText(msg) {
            if (that.checkFromId(msg)) {
                console.log('/help command:');

                let _text = "<b>HELP</b>: \n\n";

                _text = _text + '/play \n';
                _text = _text + '/pause \n';
                
                _text = _text + '/status \n';
                _text = _text + '/get \n';
                _text = _text + '/set [var_name] [value] \n';

                _text = _text + '/save [name] \n';
                _text = _text + '/load [name] \n';

                _text = _text + '/proffit - Calculate Real Proffit since start date. \n';
                _text = _text + '/restart - EXIT CURRENT OPERATION (MARKET SELL IF NEEDED)\n';

                _text = _text + '\n\n';
                _text = _text + '<b>timer1</b> - CHECKS FOR ALL THE OTHER STATUS\n';
                _text = _text + '<b>timer2</b> - RUN AI DECISION IF ITS TIME TO BUY OR SELL. CREATES BUY ORDER IF NEEDED.\n';
                _text = _text + '<b>timer3</b> - KEEP ALIVE MESSAGE, JUST SEND YOU A MSG, TELLING THAT YOUR BOT IS RUNNING NORMALY.\n';

                _text = _text + '\n\n';
                _text = _text + '<b>auto_capital</b> - CALCULATE AUTOMATICALY THE AMOUNT OF CAPITAL WILL BE USED TO CREATE THE ORDERS, BASED ON BALANCE. 0 = NOT ENABLED. 1 = ENABLED.\n';
                _text = _text + '<b>auto_capital_divisor</b> - GETS THE BALANCE AVAILABLE ON BUSD AND DIVIDE THE CAPITAL TO CREATE THE ORDER.\n';
  
                let _commands = that.getHelpCommands();
                let _options = that.getOptions(_commands);
                that.bia.sendMessage(_text,_options); 
            }
        });

        // this.telegram.onText(/\/start/, function onMessageText(msg) {
        //     if (that.checkFromId(msg)) {
        //         let _commands = this.getHelpCommands();
        //         that.bia.sendMessage('<b>WELCOME</b>',this.getOptions(_commands)); 
        //     }
        // });

        this.telegram.onText(/\/restart/, function onMessageText(msg) {
            if (that.checkFromId(msg)) {
                console.log('/restart command:');
                that.cmdRestart(that,msg);
            }
        });

        this.telegram.onText(/\/save/, function onMessageText(msg) {
            if (that.checkFromId(msg)) {
                console.log('/save command:');
                
                let _options = msg.text.split(' ');
                let _name = _options[1]; 

                that.bia.save(_name);
            }
        });

        this.telegram.onText(/\/load/, function onMessageText(msg) {
            if (that.checkFromId(msg)) {
                console.log('/load command:');
                
                let _options = msg.text.split(' ');
                let _name = _options[1]; 

                that.bia.load(_name);
            }
        });

        this.telegram.onText(/\/ls/, function onMessageText(msg) {
            if (that.checkFromId(msg)) {
                console.log('/strategy command:');

                const testFolder =  process.env.FOLDER_PATH + '/configs/saved/';
                const fs = require('fs');
                let _text = '<b>STRATEGYS SAVEDS:</b>\n\n';

                let _commands = [];

                fs.readdirSync(testFolder).forEach(file => {
                    _text = _text + file.replace('.json','') + '\n';
                    let _str = '/load ' + file.replace('.json','');
                    _commands.push(_str);
                });

                let _options = {
                    "reply_markup": {
                        "keyboard": [_commands]
                    },
                    "parse_mode": "HTML" 

                };

                that.bia.sendMessage(_text,_options);
            }
        });


        
    },
}

module.exports = bot;
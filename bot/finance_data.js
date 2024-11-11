#!/usr/bin/env node
'use strict';

const Binance = require('node-binance-api');
let moment = require('moment');
const yargs = require('yargs');
const fs = require('node:fs');

const argv = yargs
    .option('months', {
        alias: 'm',
        description: 'How many months AGO',
        default: '12',
        type: 'string',
    })
    .option('interval', {
        alias: 'i',
        description: 'Interval.',
        default: '15m',
        type: 'string',
    })
    .option('coin', {
        alias: 'c',
        description: 'The COIN PAIR config filename to load.',
        default: 'ETHBRL',
        type: 'string',
    })
    .help()
    .alias('help', 'h')
    .argv;

const binance = new Binance().options({
    APIKEY: process.env.BINANCE_APIKEY,
    APISECRET: process.env.BINANCE_APISECRET
  });

let format = function(value, precision) {
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
};

let _startTime = moment().subtract(argv.months,'months').unix();
let _maxTime = moment().unix();


console.log('MAXTIME:');
console.log(_maxTime);
let i = 0;

async function requestCandles(_startTime, _maxTime) {
    // var file_content = '';
    // var filePath = '../data/finance/' + argv.coin + '.csv';
    // if (fs.existsSync(filePath)) { 
    //     fs.unlinkSync(filePath);
    // }
    
    await binance.candlesticks(argv.coin, argv.interval, (error, ticks, symbol) => {
        let _lastTime = _startTime;
        var line = '';
        function logArrayElements(element, index, array) {
    
            let last_tick = array[index];
            let [time, open, high, low, close, volume, closeTime, assetVolume, trades, buyBaseVolume, buyAssetVolume, ignored] = last_tick;
            
            // console.log(time + ',' + format(open,2) + ',' + format(high,2) + ',' + format(low,2) + ',' + format(close,2) + ',' + format(volume,2) )
            // line =  time + ',' + format(open,2) + ',' + format(high,2) + ',' + format(low,2) + ',' + format(close,2) + ',' + format(volume,2) + '\n';

            // fs.appendFile(filePath, line, (erro) => {
            //     if (erro) {
            //       console.error('Erro ao adicionar linha:', erro);
            //       return;
            //     }
            //   });

            _lastTime = time;
            console.log('LAST:');
            console.log(_lastTime);
            return _lastTime;
        }
        ticks.forEach(_lastTime = logArrayElements);

        if (_lastTime < _maxTime) {
            requestCandles(_lastTime,_maxTime);
        }
    }, 
        {limit: 1000, startTime: _startTime  
    });

}

requestCandles(_startTime,_maxTime);

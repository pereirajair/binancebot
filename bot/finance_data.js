#!/usr/bin/env node
'use strict';

const Binance = require('binance-api-node').default
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
        default: 'BTCBRL',
        type: 'string',
    })
    .help()
    .alias('help', 'h')
    .argv;

const binance = Binance({
    apiKey: process.env.BINANCE_APIKEY,
    apiSecret: process.env.BINANCE_APISECRET
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

var _startTime = moment().subtract(argv.months,'months').unix();
var _maxTime = moment().subtract(1,'day').unix();

_startTime = _startTime * 1000;
_maxTime = _maxTime * 1000;

let i = 0;

async function requestCandles(_startTime, _maxTime) {

    var ticks = await binance.candles({ symbol: argv.coin, interval : argv.interval, startTime: _startTime, limit: 1000 });
    function logTicks(ticks) {

        var lastTime;

        for (var index in ticks) {
            let tick = ticks[index];
            console.log(tick.openTime + ',' + format(tick.open,2) + ',' + format(tick.high,2) + ',' + format(tick.low,2) + ',' + format(tick.close,2) + ',' + format(tick.volume,2) )
            lastTime = tick.openTime
        }

        return lastTime;
    }

    var last = logTicks(ticks);
    
    if (last < _maxTime) {
        requestCandles(last,_maxTime);
    }

}

requestCandles(_startTime,_maxTime);

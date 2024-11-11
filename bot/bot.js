#!/usr/bin/env node
'use strict';

const Binance = require('binance-api-node').default

const bia = require('./require/bia')
const yargs = require('yargs');
const fs = require('fs')
require('dotenv').config()

var currentPath = process.cwd();

function extend(target) {
    var sources = [].slice.call(arguments, 1);
    sources.forEach(function (source) {
        for (var prop in source) {
            target[prop] = source[prop];
        }
    });
    return target;
}

const argv = yargs
    .option('strategy', {
        alias: 's',
        description: 'The config filename to load.',
        default: 'default',
        type: 'string',
    })
    .option('coin', {
        alias: 'c',
        description: 'The COIN PAIR config filename to load.',
        default: 'ethbrl',
        type: 'string',
    })
    .help()
    .alias('help', 'h')
    .argv;

let configDataFile = currentPath + '/configs/strategy/' +  argv.strategy + '.json';
let configCoinFile = currentPath + '/configs/coins/' +  argv.coin + '.json';


process.on('unhandledRejection', (reason, p) => {
    console.log('ERRO NA BIA!');
    console.log(reason);
    console.log(p);
    bia.sendMessage("ERROR: " + reason);
});

try {
    if (fs.existsSync(configDataFile)) {

        if (fs.existsSync(configCoinFile)) {

            let conf = require(configDataFile);
            let coin = require(configCoinFile);

            var options = extend({}, conf, coin);
            // var binance = new Binance();
            var binance = Binance();

            async function biabot(){
                try {
                    var hasLoaded = false;
                    binance.time().then(async function(time) { 
                        if (!hasLoaded) {
                            hasLoaded = true;
                            bia.create(options);  
                        }
                    });

                } catch (e) {
                    console.log(e); 
                }
            }
            
            biabot();

        } else {
            console.log('FILE: ' + configCoinFile + ' NOT FOUND.');
        }
    } else {
        console.log('FILE: ' + configDataFile + ' NOT FOUND.');
    }
} catch(err) {
    console.error(err)
}

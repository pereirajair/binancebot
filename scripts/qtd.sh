#!/bin/bash


cd ./data/train/buy
QTDBUY=$(ls -l | wc -l)
echo "BUY: $QTDBUY"

cd ../../../data/train/sell
QTDSELL=$(ls -l | wc -l)
echo "SELL: $QTDSELL"

cd ../../../data/train/wait
QTDWAIT=$(ls -l | wc -l)
echo "WAIT: $QTDWAIT"


cd ../../../data/test/buy
QTDTESTBUY=$(ls -l | wc -l)
echo "TEST BUY: $QTDTESTBUY"

cd ../../../data/test/sell
QTDTESTSELL=$(ls -l | wc -l)
echo "TEST SELL: $QTDTESTSELL"

cd ../../../data/test/wait
QTDTESTWAIT=$(ls -l | wc -l)
echo "TEST WAIT: $QTDTESTWAIT"
#!/bin/bash

QTDBUY=$(ls -l ./data/train/buy | wc -l)
echo "BUY: $QTDBUY"

QTDSELL=$(ls -l ./data/train/sell | wc -l)
echo "SELL: $QTDSELL"

QTDWAIT=$(ls -l ./data/train/wait | wc -l)
echo "WAIT: $QTDWAIT"

QTDTESTBUY=$(ls -l ./data/test/buy | wc -l)
echo "TEST BUY: $QTDTESTBUY"

QTDTESTSELL=$(ls -l ./data/test/sell | wc -l)
echo "TEST SELL: $QTDTESTSELL"

QTDTESTWAIT=$(ls -l ./data/test/wait | wc -l)
echo "TEST WAIT: $QTDTESTWAIT"
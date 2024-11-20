#!/bin/bash

cd ./data/train/buy
QTDBUY=$(ls -l | wc -l)
TEMPTEST=$(echo |awk "{ print int($QTDBUY*0.2)}")
QTDTEST=${TEMPTEST%.*}
mv `ls | head -$QTDTEST` ../../test/buy

cd ../../../data/train/sell
QTDSELL=$(ls -l | wc -l)
TEMPTEST=$(echo |awk "{ print int($QTDSELL*0.2)}")
QTDTESTSELL=${TEMPTEST%.*}
mv `ls | head -$QTDTESTSELL` ../../test/sell

cd ../../../data/train/wait
QTDWAIT=$(ls -l | wc -l)
TEMPTEST=$(echo |awk "{ print int($QTDWAIT*0.2)}")
QTDTESTWAIT=${TEMPTEST%.*}
mv `ls | head -$QTDTESTWAIT` ../../test/wait

#!/bin/bash

#GENERATE FINANCE FILES
node ./bot/finance_data.js -m 6 -c $SYMBOL > ./data/finance/$SYMBOL.csv

#DELETE OLD DATA
./scripts/deleteData.sh

#GENERATE GRAPHS
cd ./ai/
python3 graphwork.py

#MOVE 20% OF FILES TO A TEST FOLDER
cd ../
./scripts/moveFiles.sh

#SHOW QTD OF FILES GENERATED IN EACH FOLDER
./scripts/qtd.sh

#STARTS TRAINING MODEL
cd ./ai/
python3 train-binary.py


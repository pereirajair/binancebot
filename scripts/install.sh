#!/bin/bash

mkdir ./data
mkdir ./data/finance
mkdir ./data/test
mkdir ./data/train
mkdir ./data/predict
mkdir ./ai/models

cd ./ai/

pyenv virtualenv ai
pyenv activate ai
pip install -r requirements.txt
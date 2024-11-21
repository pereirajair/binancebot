import os
from dotenv import load_dotenv
import tensorflow as tf
from binance.client import Client
from numpy import genfromtxt
import matplotlib.pyplot as plt
import mplfinance
from mplfinance.original_flavor import candlestick_ohlc
import numpy as np
import uuid
from keras.layers import Convolution2D, MaxPooling2D, Conv2D
from keras.models import Sequential , load_model
from keras.src.legacy.preprocessing.image import ImageDataGenerator
from keras.preprocessing.image import load_img, img_to_array
from flask import Flask
from flask_restful import Resource, Api
from flask import request, make_response
from flask import Flask, request, jsonify
from flask_cors import CORS, cross_origin
import importlib

load_dotenv()

predict_dir = '../data/predict/'
api_key = os.getenv('BINANCE_APIKEY') 
api_secret = os.getenv('BINANCE_SECRET') 
api_symbol = os.getenv('SYMBOL')
model_path = './models/' + api_symbol + '.h5'
weights_path = './models/' + api_symbol + '.weights.h5'
os.environ["TF_USE_LEGACY_KERAS"]="1"

app=Flask(__name__)
CORS(app, support_credentials=True)
tf.config.run_functions_eagerly(True)

client = Client(api_key, api_secret)
img_width, img_height = 150, 150

model = load_model(model_path)
model.load_weights(weights_path)

def convolve_sma(array, period):
    return np.convolve(array, np.ones((period,)) / period, mode='valid')

def livegraph(filename, symbol, interval, intstring):
    open = []
    high = []
    low = []
    close = []
    volume = []
    date = []
    for kline in client.get_historical_klines_generator(symbol, interval, intstring):
        date.append(kline[0])
        open.append(float(kline[1]))
        high.append(float(kline[2]))
        low.append(float(kline[3]))
        close.append(float(kline[4]))
        volume.append(float(kline[5]))

    sma = convolve_sma(close, 5)
    smb = list(sma)
    diff = sma[-1] - sma[-2]

    for x in range(len(close) - len(smb)):
        smb.append(smb[-1] + diff)

    fig = plt.figure(num=1, figsize=(3, 3), dpi=50, facecolor='w', edgecolor='k')
    dx = fig.add_subplot(111)
    mplfinance.original_flavor.candlestick2_ochl(dx, open, close, high, low, width=1.5, colorup='g', colordown='r', alpha=0.5)

    plt.autoscale()
    plt.plot(smb, color="blue", linewidth=10, alpha=0.5)
    plt.axis('off')
    plt.savefig(filename, bbox_inches='tight')

    open.clear()
    close.clear()
    volume.clear()
    high.clear()
    low.clear()
    plt.cla()
    plt.clf()

def predict(file):
    global model
    global load_img
    answer = "n/a"
    x = load_img(file, target_size=(img_width, img_height))
    x = img_to_array(x)
    x = np.expand_dims(x, axis=0)
    array = model.predict(x)
    result = array[0]
    print(result[0])
    print(result[1])
    print(result[2])

    return result


@app.route('/', methods=['POST', 'GET','OPTIONS'])
def index():
    from tensorflow.keras.preprocessing.image import ImageDataGenerator, load_img, img_to_array
    from tensorflow.keras.models import Sequential, load_model

    symbol = request.args.get('symbol')
    if symbol == "":
        symbol = "ETHBRL"

    if symbol is None:
        symbol = "ETHBRL"

    filename_15min = predict_dir + symbol + '-15min.jpg'
    livegraph(filename_15min,symbol,Client.KLINE_INTERVAL_15MINUTE, "3 hours ago UTC")
    result = predict(filename_15min) 

    answer = 'wait'
    
    if result[0] > result[1] and result[0] > result[2]:
        answer = 'buy'

    if result[1] > result[0] and result[1] > result[2]:
        answer = 'sell'

    if result[2] > result[0] and result[2] > result[1]:
        answer = 'wait'


    return {'symbol': symbol, 'result': answer, 'buy' : str(result[0]), 'sell' : str(result[1]), 'wait' : str(result[2]) }

if __name__=="__main__":
    app.run(host='0.0.0.0',threaded=False, port=5001)


import os
import pandas as pd 
from dotenv import load_dotenv
import tensorflow as tf
from binance.client import Client
import numpy as np
import matplotlib.pyplot as plt
import mplfinance as mpf
from mplfinance.original_flavor import candlestick_ohlc
from flask import Flask, request, jsonify
from tensorflow.keras.preprocessing.image import load_img, img_to_array
from tensorflow.keras.models import load_model

# Load environment variables
load_dotenv()

# Setup variables from .env
predict_dir = '../data/predict/'
api_key = os.getenv('BINANCE_APIKEY') 
api_secret = os.getenv('BINANCE_SECRET') 
api_symbol = os.getenv('SYMBOL')
model_path = './models/' + api_symbol + '.keras'
weights_path = './models/' + api_symbol + '.weights.h5'

# Initialize Flask app
app = Flask(__name__)
tf.config.run_functions_eagerly(True)
tf.data.experimental.enable_debug_mode()

# Initialize Binance client
client = Client(api_key, api_secret)

# Image dimensions
img_width, img_height = 150, 150

# Load model
# model = load_model(model_path)
# model.load_weights(weights_path)

# Function to calculate Simple Moving Average (SMA)
def convolve_sma(array, period):
    return np.convolve(array, np.ones((period,)) / period, mode='valid')

def detectar_mudancas_filtradas(numeros, fator_comparacao=0.5):
    resultados = []
    direcao_atual = None  # "subindo" ou "descendo"
    inicio_intervalo = 0  # Índice do início da alta ou baixa
    ultima_quantidade = 0  # Quantidade de números na última direção dominante

    for i in range(1, len(numeros)):
        if numeros[i] > numeros[i - 1]:  # Está subindo
            if direcao_atual != "subindo":
                if direcao_atual == "descendo" and ultima_quantidade * fator_comparacao > (i - inicio_intervalo):
                    # Ignora subida curta e considera parte da descida
                    continue
                # Finaliza a descida anterior
                if direcao_atual:
                    resultados.append({
                        "direcao": direcao_atual,
                        "inicio": inicio_intervalo,
                        "fim": i - 1,
                        "quantidade": i - inicio_intervalo
                    })
                    ultima_quantidade = i - inicio_intervalo
                # Muda a direção para "subindo"
                direcao_atual = "subindo"
                inicio_intervalo = i - 1
        elif numeros[i] < numeros[i - 1]:  # Está descendo
            if direcao_atual != "descendo":
                if direcao_atual == "subindo" and ultima_quantidade * fator_comparacao > (i - inicio_intervalo):
                    # Ignora descida curta e considera parte da subida
                    continue
                # Finaliza a subida anterior
                if direcao_atual:
                    resultados.append({
                        "direcao": direcao_atual,
                        "inicio": inicio_intervalo,
                        "fim": i - 1,
                        "quantidade": i - inicio_intervalo
                    })
                    ultima_quantidade = i - inicio_intervalo
                # Muda a direção para "descendo"
                direcao_atual = "descendo"
                inicio_intervalo = i - 1

    # Finaliza o último intervalo
    if direcao_atual:
        resultados.append({
            "direcao": direcao_atual,
            "inicio": inicio_intervalo,
            "fim": len(numeros) - 1,
            "quantidade": len(numeros) - inicio_intervalo
        })

    return resultados

# Function to generate live graph for prediction
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

    # Create a DataFrame to use with mplfinance
    ohlc_data = {
        'Date': date,
        'Open': open,
        'High': high,
        'Low': low,
        'Close': close,
        'Volume': volume
    }

    df = pd.DataFrame(ohlc_data)

    # Convert date from milliseconds to datetime
    df['Date'] = pd.to_datetime(df['Date'], unit='ms')

    # Set the 'Date' column as the index
    df.set_index('Date', inplace=True)

    # Plot candlestick chart using mplfinance

    fig = plt.figure(num=1, figsize=(3, 3), dpi=50, facecolor='w', edgecolor='k')
    dx = fig.add_subplot(111)
    mpf.original_flavor.candlestick2_ochl(dx, open, close, high, low, width=1.5, colorup='g', colordown='r', alpha=0.5)


    resultado = detectar_mudancas_filtradas(close,0.80)
    for r in resultado:
        print(f"Direção: {r['direcao']}, Início: {r['inicio']}, Fim: {r['fim']}, Quantidade: {r['quantidade']}")


    plt.autoscale()
    plt.plot(smb, color="blue", linewidth=10, alpha=0.5)
    plt.axis('off')
    plt.savefig(filename, bbox_inches='tight')

    close_first = float(close[0])
    close_last = float(close[len(close) - 1])

    comp_ratio_close = close_last / close_first

    decision = 'wait'
    if (comp_ratio_close >= 1.0005):
            decision = 'sell'
    else: 
        if (comp_ratio_close <= 0.999):
            decision = 'buy'
        
    open.clear()
    close.clear()
    volume.clear()
    high.clear()
    low.clear()
    plt.cla()
    plt.clf()

    return decision

# Prediction function
def predict(file):
    global model
    answer = "n/a"
    x = load_img(file, target_size=(img_width, img_height))
    x = img_to_array(x)
    x = np.expand_dims(x, axis=0)
    array = model.predict(x)
    result = array[0]
    print(f"Buy: {result[0]}, Sell: {result[1]}")

    return result

# Flask route to handle predictions
@app.route('/', methods=['POST', 'GET', 'OPTIONS'])
def index():
    symbol = request.args.get('symbol', default="ETHBRL")

    filename_15min = predict_dir + symbol + '-15min.jpg'
    answer = livegraph(filename_15min, symbol, Client.KLINE_INTERVAL_15MINUTE, "6 hours ago UTC")
    # result = predict(filename_15min)

    # answer = ''
    # # Only two classes: buy and sell
    # if result[0] > result[1]:
    #     answer = 'buy'
    # elif result[1] > result[0]:
    #     answer = 'sell'

    return jsonify({'symbol': symbol, 'result': answer })

    # return jsonify({'symbol': symbol, 'result': answer, 'buy': str(result[0]), 'sell': str(result[1])})

# Run Flask app
if __name__ == "__main__":
    app.run(host='0.0.0.0', threaded=False, port=5001)

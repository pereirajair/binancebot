from numpy import genfromtxt
import matplotlib.pyplot as plt
import mplfinance
import numpy as np
import uuid

import mplfinance
from mplfinance.original_flavor import candlestick_ohlc

import os
from dotenv import load_dotenv
load_dotenv()

import pandas as pd
print('pandas version=',pd.__version__)

import mplfinance as mpf
print('mplfinance version=',mpf.__version__)

SYMBOL = os.getenv('SYMBOL')

# Input your csv file here with historical data

pd = genfromtxt('../data/finance/' + SYMBOL + '.csv', delimiter=',' ,dtype=str)
#pd = np.flipud(ad)

buy_dir = '../data/train/buy/'
sell_dir = '../data/train/sell/'
wait_dir = '../data/train/wait/'

def convolve_sma(array, period):
    return np.convolve(array, np.ones((period,))/period, mode='valid')

def graphwork(start, finish):
    open = []
    high = []
    low = []
    close = []
    volume = []
    date = []

    close_first = float(pd[start][4])

    for x in range(finish-start):

# Below filtering is valid for eurusd.csv file. Other financial data files have different orders so you need to find out
# what means open, high and close in their respective order.

        open.append(float(pd[start][1]))
        high.append(float(pd[start][2]))
        low.append(float(pd[start][3]))
        close.append(float(pd[start][4]))
        volume.append(float(pd[start][5]))
        last_close = float(pd[start][4])
        next_low = float(pd[start][3])
        next_high = float(pd[start][2])
        date.append(pd[start][0])
        start = start + 1

    close_next = float(pd[finish][4])
    next_finish = start + 18
    next_start = start

    for y in range(next_finish-next_start):
        this_high = float(pd[next_start][2])
        this_low = float(pd[next_start][3])
        # print('this_high: ' + str(this_high) + ' - ' +  str(next_high))
        # print('next_high: ' + str(next_high))
        if this_high >= next_high:
            next_high = this_high
        if this_low <= next_low:
            next_low = this_low
        next_start = next_start + 1

    high_next = float(pd[finish + 1][2])

    comp_ratio_high = next_high / last_close
    comp_ratio_low = next_low / last_close

    comp_ratio_close = last_close / close_first

    sma = convolve_sma(close, 5)
    smb = list(sma)
    diff = sma[-1] - sma[-2]

    for x in range(len(close)-len(smb)):
        smb.append(smb[-1]+diff)

    decision = 'wait'
    if (comp_ratio_close >= 1.005):
            decision = 'sell'
    else: 
        if (comp_ratio_close <= 0.995):
            decision = 'buy'
        
        # else:
            # if (comp_ratio_l`ow <= 0.98) and (comp_ratio_high >= 0.98):
                # decision = 'sell'

    print(decision)

    # decision = 'none'
    # if close[-1] > close_next:
    #     decision = 'sell'
    # else:
    #     decision = 'buy'
    
    if (decision == 'buy') or (decision == 'sell') or (decision == 'wait'):    

        # dirdecision = "wait"
        # if close_first > close_next:
        #     dirdecision = 'buy'
        # else:
        #     dirdecision = 'sell'

        print('next_finish: ' + str(next_finish))
        print('next_start: ' + str(next_start))
        print('comp_ratio_high: ' + str(comp_ratio_high))
        print('comp_ratio_low: ' + str(comp_ratio_low))
        print('comp_ratio_close: ' + str(comp_ratio_close))
        print('last close: ' + str(last_close))
        print('next high: ' + str(next_high))
        print('next low: ' + str(next_low))
        print(close_first)
        print(close_next)
        print(decision)
        # print(dirdecision)
        print("---------------")

        directory = wait_dir

        # if ((decision == 'sell') and (dirdecision == 'sell')):
        if (decision == 'sell'):
            directory = sell_dir

        # if ((decision == 'buy') and (dirdecision == 'buy')):
        if (decision == 'buy'):
            directory = buy_dir

        fig = plt.figure(num=1, figsize=(3, 3), dpi=50, facecolor='w', edgecolor='k')
        dx = fig.add_subplot(111)
        # ax = fig.add_subplot(222)
        # mplfinance.volume_overlay(ax, open, close, volume, width=0.4, colorup='b', colordown='b', alpha=1)
        mplfinance.original_flavor.candlestick2_ochl(dx, open, close, high, low, width=1.5, colorup='g', colordown='r', alpha=0.5)

        plt.autoscale()
        plt.plot(smb, color="blue", linewidth=10, alpha=0.5)
        plt.axis('off')
        plt.savefig(directory + str(uuid.uuid4()) +'.jpg', bbox_inches='tight')
        plt.cla()
        plt.clf()
        
        #plt.show()
    open.clear()
    close.clear()
    volume.clear()
    high.clear()
    low.clear()
        



iter_count = int(len(pd)/4)
print(iter_count)
iter = 0


for x in range(len(pd)-12):
   print(iter)
   graphwork(iter, iter+12)
   iter = iter + 1
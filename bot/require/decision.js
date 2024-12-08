
const bia = require('./bia');
const coin = require('./coin')

const decision = {

    exchange: null,

    setExchange: function(exchange) {
        if (!exchange) {
            this.log('Exchange not provided', 'error');
            throw new Error('Exchange not provided');
        }
        this.exchange = exchange;
        return this;
    },

    getCalculatedDecision: async function(symbol) {
        const endTime = Date.now();
        const startTime = endTime - 24 * 60 * 60 * 1000; // 3 horas em milissegundos

        const candles = await this.exchange.candles({
            symbol: symbol,      
            interval: '15m',     
            startTime: startTime,
            endTime: endTime
        });
        

        var closeNumbers = [];
        var openNumbers = [];
        var highNumbers = [];
        var lowNumbers = [];

        var highest = 0;
        var lowest = candles[0].high * 100;

        for (var i in candles) {
            closeNumbers.push(parseFloat(candles[i].close));
            openNumbers.push(parseFloat(candles[i].open));
            highNumbers.push(parseFloat(candles[i].high));
            lowNumbers.push(parseFloat(candles[i].low));

            if (candles[i].high > highest) {
                highest = parseFloat(candles[i].high);
            }

            if ((candles[i].low) < lowest) {
                lowest = parseFloat(candles[i].low);
            }

            console.log(i + ' - ' + candles[i].close);
        }

        var average = (highest + lowest) / 2;
        // console.log('Highest: ' + highest);
        // console.log('Lowest: ' + lowest);
        // console.log('Average: ' + average);

    
        const fatorComparacao = 0.999;
        var decision = 'wait';
        // const resultado = detectUpAndDownTrends(closeNumbers, fatorComparacao);
        const trends = this.detectTrends(closeNumbers,fatorComparacao);
        const resultado = this.groupTrends(trends);
        console.log(resultado);

        if (resultado != false) {
            let penultimo = resultado[resultado.length - 2];
            let ultimo = resultado[resultado.length - 1];

            
            if (ultimo.trend == 'uptrend') {

                var fibonacciLevels = this.calculateFibonacciLevelsWithTrend(penultimo.startValue,penultimo.endValue);
                console.log(`Fibonacci levels between:`, fibonacciLevels);

                if (ultimo.endValue >= fibonacciLevels.levels[0]) {
                    decision = 'sell'
                }

            } else {
                if (ultimo.count >= 2) {

                    var fibonacciLevels = this.calculateFibonacciLevelsWithTrend(penultimo.startValue,penultimo.endValue);
                    console.log(`Fibonacci levels between:`, fibonacciLevels);

                    if (ultimo.startValue <= ultimo.endValue) { //UPTREND
                        if (ultimo.endValue <= fibonacciLevels.levels[0]) {
                            decision = 'sell'
                        }
                    } else {
                        if (ultimo.endValue <= fibonacciLevels.levels[0]) {
                            decision = 'buy'
                        }
                    }

                }
            }
        }
        console.log(decision);
        return decision;
    },
    detectTrends: function(numbers, factor) {
        if (numbers.length < 2) {
            return []; // Sem dados suficientes para determinar a tendência
        }
    
        const trends = []; // Array para armazenar a tendência
        let currentTrend = null; // Tendência atual: "uptrend", "downtrend" ou null
    
        for (let i = 1; i < numbers.length; i++) {
            const diff = numbers[i] - numbers[i - 1];
            const significantChange = Math.abs(diff) > Math.abs(numbers[i - 1] * (1 - factor));
    
            // console.log(Math.abs(diff) + ' - ' + Math.abs(numbers[i - 1] * (1 - factor)));
            // console.log(significantChange);
            const valor = numbers[i];
    
            if (significantChange) {
                if (diff > 0) {
                    currentTrend = "uptrend";
                } else if (diff < 0) {
                    currentTrend = "downtrend";
                }
            }
            trends.push({ trend: currentTrend, valor: valor });
        }
    
        return trends;
    },
    groupTrends: function(data) {
        const groupedTrends = [];
        let currentGroup = null;
    
        data.forEach((item, index) => {
            if (!currentGroup || currentGroup.trend !== item.trend) {
                // Push the previous group to the result if it exists
                if (currentGroup) {
                    currentGroup.endValue = data[index - 1].valor;
                    groupedTrends.push(currentGroup);
                }
                // Start a new group
                currentGroup = {
                    trend: item.trend,
                    startValue: item.valor,
                    count: 1, // Initialize count
                };
            } else {
                // Increment count if the trend continues
                currentGroup.count++;
            }
        });
    
        // Add the last group to the result
        if (currentGroup) {
            currentGroup.endValue = data[data.length - 1].valor;
            groupedTrends.push(currentGroup);
        }
    
        return groupedTrends;
    },
    calculateFibonacciLevelsWithTrend: function(start, end) {
        // Detect trend
        const trend = end > start ? "uptrend" : "downtrend";
    
        // Calculate Fibonacci levels
        const difference = Math.abs(end - start);
        const fibonacciLevels = [0.48, 0.3];
    
        // Determine levels based on trend
        const levels = fibonacciLevels.map(level => {
            return trend === "uptrend"
                ? start + level * difference // Levels move up
                : start - level * difference; // Levels move down
        });
    
        return {
            trend,
            levels
        };
    },
}

module.exports = decision;
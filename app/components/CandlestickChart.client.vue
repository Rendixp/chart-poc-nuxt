<script setup>
import BaseChart from './BaseChart.client.vue';
import { generateCandlestickData } from '../constants/marketData';

const rawData = generateCandlestickData(100);

const candlestickData = rawData.map(d => ({
    time: d.time,
    open: d.open,
    high: d.high,
    low: d.low,
    close: d.close,
}));

const areaData = rawData.map(d => ({
    time: d.time,
    value: d.close,
}));

const chartOptions = {
    layout: {
        background: { color: '#161616' },
        textColor: '#9a9a9a',
        fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif',
    },
    rightPriceScale: {
        borderColor: '#2a2a2a',
        scaleMargins: {
            top: 0.2, // Leave space for candles if they spike
            bottom: 0.1,
        },
    },
    timeScale: {
        borderColor: '#2a2a2a',
        timeVisible: true,
        secondsVisible: false,
    },
    grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.04)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.08)' },
    },
    crosshair: {
        vertLine: { color: 'rgba(255, 255, 255, 0.25)' },
        horzLine: { color: 'rgba(255, 255, 255, 0.2)' },
    },
};

const seriesList = [
    {
        type: 'area',
        data: areaData,
        options: {
            lineColor: 'rgba(255, 138, 43, 0.0)',
            topColor: 'rgba(80, 50, 30, 0.5)',
            bottomColor: 'rgba(80, 50, 30, 0.05)',
            lineWidth: 0,
            priceLineVisible: false,
            lastValueVisible: false,
        }
    },
    {
        type: 'candlestick',
        data: candlestickData,
        options: {
            upColor: '#4caf50',
            downColor: '#ef5350',
            borderVisible: false,
            wickUpColor: '#4caf50',
            wickDownColor: '#ef5350',
            priceLineVisible: false,
            lastValueVisible: false,
        }
    }
];

</script>

<template>
    <div class="page">
        <div class="card">
            <div class="chart-container">
                <BaseChart
                    :series="seriesList"
                    :autosize="true"
                    :chart-options="chartOptions"
                />
            </div>
        </div>
    </div>
</template>

<style scoped>
.page {
    min-height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    box-sizing: border-box;
    background: #0f0f0f;
}
.card {
    width: min(980px, 100%);
    background: #161616;
    border-radius: 12px;
    padding: 18px 20px 16px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
}
.header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
    letter-spacing: 0.04em;
    font-family: 'Inter', sans-serif;
}
.label {
    color: #cfcfcf;
    font-size: 14px;
    font-weight: 700;
    margin-right: 16px;
}
.price-info {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-grow: 1;
}
.value {
    color: #cfcfcf;
    font-size: 16px;
    font-weight: 600;
    font-family: monospace;
}
.change-label {
    color: #666;
    font-size: 14px;
}
.change-value {
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 14px;
    font-weight: 600;
}
.change-value.positive {
    background: rgba(76, 175, 80, 0.2);
    color: #4caf50;
}
.change-value.negative {
    background: rgba(239, 83, 80, 0.2);
    color: #ef5350;
}

.controls {
    display: flex;
    align-items: center;
}
.toggle-btn {
    color: #ff8a2b;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 6px;
}
.icon {
    font-size: 14px;
}

.chart-container {
    height: 400px;
    width: 100%;
}
</style>

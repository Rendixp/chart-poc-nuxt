<script setup>
import BaseChart from './BaseChart.client.vue';
import { data_5m } from '../constants/dummy.ts';

const chartOptions = {
    layout: {
        background: { color: '#161616' },
        textColor: '#9a9a9a',
        fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif',
    },
    rightPriceScale: {
        borderColor: '#2a2a2a',
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
const data = data_5m.map(point => ({
    time: Math.floor(new Date(point.x.replace(' ', 'T') + 'Z').getTime() / 1000),
    value: point.y,
}));
const seriesOptions = {
    lineColor: '#ff8a2b',
    topColor: 'rgba(255, 138, 43, 0.25)',
    bottomColor: 'rgba(255, 138, 43, 0)',
    lineWidth: 2,
    priceLineVisible: false,
    lastValueVisible: false,
};
const chartType = 'area';
const lastPoint = data[data.length - 1];
const formattedPrice = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
}).format(lastPoint ? lastPoint.value : 0);
</script>

<template>
    <div class="page">
        <div class="card">
            <div class="header">
                <div class="label">PRICE</div>
                <div class="value">{{ formattedPrice }}</div>
            </div>
            <div class="chart-container">
                <BaseChart
                    :type="chartType"
                    :data="data"
                    :autosize="true"
                    :chart-options="chartOptions"
                    :series-options="seriesOptions"
                />
            </div>
        </div>
    </div>
</template>

<style>
html,
body {
    height: 100%;
    margin: 0;
    background: #0f0f0f;
}
</style>
<style scoped>
.page {
    min-height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    box-sizing: border-box;
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
    align-items: baseline;
    gap: 10px;
    margin-bottom: 12px;
    letter-spacing: 0.04em;
}
.label {
    color: #cfcfcf;
    font-size: 12px;
    font-weight: 600;
}
.value {
    color: #ff8a2b;
    font-size: 14px;
    font-weight: 600;
}
.chart-container {
    height: 340px;
    width: 100%;
}
</style>

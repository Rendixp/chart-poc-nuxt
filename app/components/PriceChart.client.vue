<script setup>
import { computed } from 'vue';
import BaseChart from './BaseChart.client.vue';
import { data_5m } from '../constants/dummy.ts';

const props = defineProps({
    datasets: {
        type: Array,
        default: () => [],
    },
});

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

const defaultData = data_5m.map((point) => ({
    time: Math.floor(new Date(point.x.replace(' ', 'T') + 'Z').getTime() / 1000),
    value: point.y,
}));

const defaultSeriesOptions = {
    lineColor: '#ff8a2b',
    topColor: 'rgba(255, 138, 43, 0.25)',
    bottomColor: 'rgba(255, 138, 43, 0)',
    lineWidth: 2,
    priceLineVisible: false,
    lastValueVisible: false,
};

const defaultSeries = [
    {
        type: 'area',
        data: defaultData,
        options: defaultSeriesOptions,
    },
];

const palette = [
    { line: '#ff8a2b', top: 'rgba(255, 138, 43, 0.25)', bottom: 'rgba(255, 138, 43, 0)' },
    { line: '#2962FF', top: 'rgba(41, 98, 255, 0.25)', bottom: 'rgba(41, 98, 255, 0)' },
    { line: '#26a69a', top: 'rgba(38, 166, 154, 0.25)', bottom: 'rgba(38, 166, 154, 0)' },
    { line: '#ab47bc', top: 'rgba(171, 71, 188, 0.25)', bottom: 'rgba(171, 71, 188, 0)' },
    { line: '#ef5350', top: 'rgba(239, 83, 80, 0.25)', bottom: 'rgba(239, 83, 80, 0)' },
];

const normalizeDataset = (dataset) => {
    if (!dataset || dataset.length === 0) return [];
    const sample = dataset[0];
    if (sample.time !== undefined && sample.value !== undefined) {
        return dataset.map((point) => ({
            time: point.time,
            value: point.value,
        }));
    }
    if (sample.timestamp !== undefined && sample.price !== undefined) {
        return dataset
            .map((point) => ({
                time: Math.floor(new Date(point.timestamp).getTime() / 1000),
                value: point.price,
            }))
            .sort((a, b) => a.time - b.time);
    }
    if (sample.x !== undefined && sample.y !== undefined) {
        return dataset.map((point) => ({
            time: Math.floor(new Date(point.x.replace(' ', 'T') + 'Z').getTime() / 1000),
            value: point.y,
        }));
    }
    return [];
};

const finalSeries = computed(() => {
    if (props.datasets && props.datasets.length > 0) {
        return props.datasets.slice(0, 5).map((dataset, index) => {
            const colors = palette[index % palette.length];
            return {
                type: 'area',
                data: normalizeDataset(dataset),
                options: {
                    lineColor: colors.line,
                    topColor: colors.top,
                    bottomColor: colors.bottom,
                    lineWidth: 2,
                    priceLineVisible: false,
                    lastValueVisible: false,
                },
            };
        });
    }
    return defaultSeries;
});

const formattedPrice = computed(() => {
    if (finalSeries.value.length === 1) {
        const seriesData = finalSeries.value[0].data;
        const lastPoint = seriesData[seriesData.length - 1];
        if (!lastPoint) return '$0.00';
        
        const value = lastPoint.value;
        const fractionDigits = value < 1 ? 8 : 2;
        
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: fractionDigits,
        }).format(value);
    }
    return 'Multiple Datasets';
});
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
                    :autosize="true"
                    :chart-options="chartOptions"
                    :series="finalSeries"
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

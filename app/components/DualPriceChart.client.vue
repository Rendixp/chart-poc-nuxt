<script setup>
import { computed, ref, watch, onMounted, nextTick } from 'vue';
import BaseChart from './BaseChart.client.vue';
import { data_5m } from '../constants/dummy.ts';

const props = defineProps({
    datasets: {
        type: Array,
        default: () => [],
    },
});

const chartRef1 = ref(null);
const chartRef2 = ref(null);
const singleChartRef = ref(null);

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
        return dataset
            .map((point) => ({
                time: point.time,
                value: point.value,
            }))
            .sort((a, b) => a.time - b.time);
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
        return dataset
            .map((point) => ({
                time: Math.floor(new Date(point.x.replace(' ', 'T') + 'Z').getTime() / 1000),
                value: point.y,
            }))
            .sort((a, b) => a.time - b.time);
    }
    return [];
};

const normalizedDatasets = computed(() => {
    if (props.datasets && props.datasets.length > 0) {
        return props.datasets.map(normalizeDataset);
    }
    return [defaultData]; // Fallback to default data
});

const buildAlignedDatasets = (datasets) => {
    if (!datasets || datasets.length === 0) return [];
    const allTimesSet = new Set();
    datasets.forEach((dataset) => {
        dataset.forEach((point) => {
            allTimesSet.add(point.time);
        });
    });
    const allTimes = Array.from(allTimesSet).sort((a, b) => a - b);
    return datasets.map((dataset) => {
        if (!dataset || dataset.length === 0) return [];
        const valueByTime = new Map(dataset.map((point) => [point.time, point.value]));
        const firstValue = dataset[0]?.value ?? null;
        let lastValue = null;
        return allTimes.map((time) => {
            const existingValue = valueByTime.get(time);
            if (existingValue !== undefined) {
                lastValue = existingValue;
                return { time, value: existingValue };
            }
            if (lastValue !== null) {
                return { time, value: lastValue };
            }
            return { time, value: firstValue };
        });
    });
};

const alignedDatasets = computed(() => buildAlignedDatasets(normalizedDatasets.value));

const getPriceFormat = (dataset) => {
    if (!dataset || dataset.length === 0) {
        return { precision: 2, minMove: 0.01 };
    }
    const positiveValues = dataset.map((p) => Math.abs(p.value)).filter((v) => v > 0);
    const minValue = positiveValues.length > 0 ? Math.min(...positiveValues) : 0;
    let precision = 2;
    if (minValue > 0 && minValue < 1) {
        precision = Math.min(8, Math.max(2, Math.ceil(Math.abs(Math.log10(minValue))) + 2));
    }
    const minMove = Number((1 / Math.pow(10, precision)).toFixed(precision));
    return { precision, minMove };
};

const isDualChart = computed(() => {
    // If we have at least 2 datasets, check their range difference
    if (normalizedDatasets.value.length >= 2) {
        const d1 = normalizedDatasets.value[0];
        const d2 = normalizedDatasets.value[1];
        
        if (d1.length === 0 || d2.length === 0) return false;
        
        const max1 = Math.max(...d1.map(p => p.value));
        const max2 = Math.max(...d2.map(p => p.value));
        
        // Avoid division by zero
        if (max1 === 0 || max2 === 0) return false;
        
        // Calculate magnitude difference based on max values
        const ratio = Math.max(max1, max2) / Math.min(max1, max2);
        
        // If one is > 5x larger than the other, use dual chart
        return ratio > 5;
    }
    return false;
});

const finalSeries = computed(() => {
    return alignedDatasets.value.slice(0, 5).map((data, index) => {
        const colors = palette[index % palette.length];
        return {
            type: 'area',
            data: data,
            options: {
                lineColor: colors.line,
                topColor: colors.top,
                bottomColor: colors.bottom,
                lineWidth: 2,
                priceLineVisible: false,
                lastValueVisible: false,
                priceFormat: getPriceFormat(data),
            },
        };
    });
});

const series1 = computed(() => [finalSeries.value[0]]);
const series2 = computed(() => [finalSeries.value[1]]);

// Synchronization Logic
let isSyncingLeft = false;
let isSyncingRight = false;
let isSyncingRange = false;

const getSeriesDataPoint = (seriesIndex, time) => {
    const dataset = alignedDatasets.value[seriesIndex];
    if (!dataset) return null;
    // Assuming data is sorted by time, we can find it.
    // For performance, maybe use binary search or map, but finding is okay for now.
    return dataset.find(d => d.time === time);
};

const syncCharts = () => {
    if (!chartRef1.value || !chartRef2.value) return;
    
    const chart1 = chartRef1.value.chart;
    const chart2 = chartRef2.value.chart;
    
    // Access series instances. BaseChart exposes seriesInstances (array) or seriesInstance (single)
    // We are passing 'series' prop which is an array, so BaseChart will use 'seriesInstances'.
    const series1Instances = chartRef1.value.seriesInstances;
    const series2Instances = chartRef2.value.seriesInstances;

    if (!chart1 || !chart2 || !series1Instances || !series2Instances) return;
    
    // We assume each chart has 1 series in dual mode (since we split them)
    const series1 = series1Instances[0];
    const series2 = series2Instances[0];

    if (!series1 || !series2) return;

    // Sync Crosshair
    chart1.subscribeCrosshairMove((param) => {
        if (isSyncingRight) return;
        isSyncingLeft = true;
        
        if (param.time) {
            // Re-fetch current series instance inside callback to handle updates
            const currentSeries2 = chartRef2.value?.seriesInstances?.[0];
            if (currentSeries2) {
                const dataPoint = getSeriesDataPoint(1, param.time); // Get data for chart 2 (index 1)
                if (dataPoint) {
                    chart2.setCrosshairPosition(dataPoint.value, param.time, currentSeries2);
                } else {
                    chart2.clearCrosshairPosition();
                }
            }
        } else {
             chart2.clearCrosshairPosition();
        }
        isSyncingLeft = false;
    });

    chart2.subscribeCrosshairMove((param) => {
        if (isSyncingLeft) return;
        isSyncingRight = true;
        
        if (param.time) {
            // Re-fetch current series instance inside callback
            const currentSeries1 = chartRef1.value?.seriesInstances?.[0];
            if (currentSeries1) {
                const dataPoint = getSeriesDataPoint(0, param.time); // Get data for chart 1 (index 0)
                if (dataPoint) {
                    chart1.setCrosshairPosition(dataPoint.value, param.time, currentSeries1);
                } else {
                    chart1.clearCrosshairPosition();
                }
            }
        } else {
            chart1.clearCrosshairPosition();
        }
        isSyncingRight = false;
    });

    // Sync Time Scale (Zoom/Pan)
    chart1.timeScale().subscribeVisibleLogicalRangeChange((range) => {
        if (isSyncingRange) return;
        isSyncingRange = true;
        chart2.timeScale().setVisibleLogicalRange(range);
        isSyncingRange = false;
    });

    chart2.timeScale().subscribeVisibleLogicalRangeChange((range) => {
        if (isSyncingRange) return;
        isSyncingRange = true;
        chart1.timeScale().setVisibleLogicalRange(range);
        isSyncingRange = false;
    });
};

watch(() => isDualChart.value, (newVal) => {
    if (newVal) {
        nextTick(() => {
            syncCharts();
        });
    }
});

onMounted(() => {
    if (isDualChart.value) {
        nextTick(() => {
            syncCharts();
        });
    }
});

const formattedPrice = computed(() => {
    if (alignedDatasets.value.length >= 1) {
        // Just show the first dataset's last price for simplicity, or "Dual View"
        if (isDualChart.value) return 'Dual View';
        
        const seriesData = alignedDatasets.value[0];
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
    return 'No Data';
});

</script>

<template>
    <div class="page">
        <div class="card">
            <div class="header">
                <div class="label">PRICE</div>
                <div class="value">{{ formattedPrice }}</div>
            </div>
            
            <div class="chart-container" v-if="!isDualChart">
                <BaseChart
                    ref="singleChartRef"
                    :autosize="true"
                    :chart-options="chartOptions"
                    :series="finalSeries"
                />
            </div>
            
            <div class="dual-chart-container" v-else>
                <div class="chart-row">
                    <BaseChart
                        ref="chartRef1"
                        :autosize="true"
                        :chart-options="chartOptions"
                        :series="series1"
                    />
                </div>
                <div class="chart-row">
                    <BaseChart
                        ref="chartRef2"
                        :autosize="true"
                        :chart-options="chartOptions"
                        :series="series2"
                    />
                </div>
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
.dual-chart-container {
    height: 600px;
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 10px;
}
.chart-row {
    flex: 1;
    position: relative;
}
</style>

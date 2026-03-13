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

const chartRefs = ref([]);

const chartOptions = {
    layout: {
        background: { color: '#161616' },
        textColor: '#9a9a9a',
        fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif',
    },
    rightPriceScale: {
        borderColor: '#2a2a2a',
        minimumWidth: 90, // Set global minimum width for alignment
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

// Group datasets based on value proximity (5x rule)
const groupedDatasets = computed(() => {
    const datasets = alignedDatasets.value.slice(0, 5);
    if (datasets.length === 0) return [];

    // Calculate max value for each dataset
    const withMax = datasets.map((data, originalIndex) => {
        const max = data.length > 0 ? Math.max(...data.map(p => p.value)) : 0;
        return { data, max, originalIndex };
    });

    const sorted = [...withMax].sort((a, b) => b.max - a.max);

    const groups = [];
    
    sorted.forEach(item => {
        let added = false;

        for (const group of groups) {
            const groupMax = group[0].max;
            const ratio = Math.max(groupMax, item.max) / Math.min(groupMax, item.max);
            
            if (ratio <= 5) {
                group.push(item);
                added = true;
                break;
            }
        }
        if (!added) {
            groups.push([item]);
        }
    });

    groups.sort((g1, g2) => {
        const max1 = Math.max(...g1.map(i => i.max));
        const max2 = Math.max(...g2.map(i => i.max));
        return max2 - max1; // Descending: High -> Low
    });

    return groups;
});

const isStackedChart = computed(() => {
    return groupedDatasets.value && groupedDatasets.value.length > 1;
});

const stackedSeries = computed(() => {
    if (!groupedDatasets.value || groupedDatasets.value.length === 0) return [];
    
    return groupedDatasets.value.map(group => {
        return group.map(item => {
            const colors = palette[item.originalIndex % palette.length];
            return {
                type: 'area',
                data: item.data,
                options: {
                    lineColor: colors.line,
                    topColor: colors.top,
                    bottomColor: colors.bottom,
                    lineWidth: 2,
                    priceLineVisible: false,
                    lastValueVisible: false,
                    priceFormat: getPriceFormat(item.data),
                },
            };
        });
    });
});

const finalSeries = computed(() => {
    if (!isStackedChart.value && stackedSeries.value.length > 0) {
        return stackedSeries.value[0];
    }
    return [];
});


let isSyncingCrosshair = false;
let isSyncingRange = false;

const getSeriesDataPoint = (groupIndex, seriesIndexInGroup, time) => {
    const group = groupedDatasets.value[groupIndex];
    if (!group) return null;
    const item = group[seriesIndexInGroup];
    if (!item) return null;
    return item.data.find(d => d.time === time);
};

const syncCharts = () => {
    if (!chartRefs.value || chartRefs.value.length === 0) return;
    
    const validRefs = chartRefs.value.filter(r => r && r.chart);
    if (validRefs.length < 2) return;

    const alignedWidth = 90; 
    
    validRefs.forEach(ref => {
        ref.chart.applyOptions({
            rightPriceScale: {
                minimumWidth: alignedWidth,
            }
        });
    });

    validRefs.forEach((ref, groupIndex) => {
        const chart = ref.chart;
        const seriesInstances = ref.seriesInstances;
        if (!seriesInstances || seriesInstances.length === 0) return;

        // Sync Crosshair
        chart.subscribeCrosshairMove((param) => {
            if (isSyncingCrosshair) return;
            isSyncingCrosshair = true;
            
            validRefs.forEach((targetRef, targetGroupIndex) => {
                if (groupIndex === targetGroupIndex) return;
                
                const targetChart = targetRef.chart;
                const targetSeriesInstances = targetRef.seriesInstances;
                
                if (targetChart && targetSeriesInstances && targetSeriesInstances.length > 0) {

                    const targetSeries = targetSeriesInstances[0];                    
                     if (param.time) {
                        const dataPoint = getSeriesDataPoint(targetGroupIndex, 0, param.time);
                        if (dataPoint) {
                            targetChart.setCrosshairPosition(dataPoint.value, param.time, targetSeries);
                        } else {
                            targetChart.clearCrosshairPosition();
                        }
                    } else {
                        targetChart.clearCrosshairPosition();
                    }
                }
            });
            
            isSyncingCrosshair = false;
        });

        // Sync Time Scale
        chart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
            if (isSyncingRange) return;
            isSyncingRange = true;
            
            validRefs.forEach((targetRef, targetGroupIndex) => {
                if (groupIndex === targetGroupIndex) return;
                const targetChart = targetRef.chart;
                if (targetChart) {
                    targetChart.timeScale().setVisibleLogicalRange(range);
                }
            });
            
            isSyncingRange = false;
        });
    });
};

watch(() => isStackedChart.value, () => {
    nextTick(() => {
        syncCharts();
    });
});

onMounted(() => {
    nextTick(() => {
        syncCharts();
    });
});

const formattedPrice = computed(() => {
    if (alignedDatasets.value.length >= 1) {
        if (isStackedChart.value) return `${alignedDatasets.value.length} Datasets (Stacked)`;
        
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

const getChartOptions = (index, total) => {
    const isLast = index === total - 1;
    return {
        ...chartOptions,
        timeScale: {
            ...chartOptions.timeScale,
            visible: isLast, // Only show for the last chart
        }
    };
};

</script>

<template>
    <div class="page">
        <div class="card">
            <div class="header">
                <div class="label">PRICE</div>
                <div class="value">{{ formattedPrice }}</div>
            </div>
            
            <div class="chart-container" v-if="!isStackedChart">
                <BaseChart
                    ref="singleChartRef"
                    :autosize="true"
                    :chart-options="chartOptions"
                    :series="finalSeries"
                />
            </div>
            
            <div class="stacked-chart-container" v-else>
                <div 
                    class="chart-row" 
                    v-for="(series, index) in stackedSeries" 
                    :key="index"
                >
                    <BaseChart
                        ref="chartRefs"
                        :autosize="true"
                        :chart-options="getChartOptions(index, stackedSeries.length)"
                        :series="series"
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
.stacked-chart-container {
    height: 600px;
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 10px;
}
.chart-row {
    flex: 1;
    position: relative;
    /* Ensure charts don't overflow */
    min-height: 0; 
}
</style>

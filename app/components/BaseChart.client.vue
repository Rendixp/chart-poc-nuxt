<script>
import {
    createChart,
    LineSeries,
    AreaSeries,
    BarSeries,
    CandlestickSeries,
    HistogramSeries,
    BaselineSeries,
} from 'lightweight-charts';

function getChartSeriesDefinition(type) {
    switch (type.toLowerCase()) {
        case 'line':
            return LineSeries;
        case 'area':
            return AreaSeries;
        case 'bar':
            return BarSeries;
        case 'candlestick':
            return CandlestickSeries;
        case 'histogram':
            return HistogramSeries;
        case 'baseline':
            return BaselineSeries;
    }
    return LineSeries;
}

export default {
    props: {
        type: {
            type: String,
            default: 'line',
        },
        data: {
            type: Array,
            required: true,
        },
        autosize: {
            default: true,
            type: Boolean,
        },
        chartOptions: {
            type: Object,
        },
        seriesOptions: {
            type: Object,
        },
        series: {
            type: Array,
            default: () => [],
        },
    },
    mounted() {
        this.chart = createChart(this.$refs.chartContainer, this.chartOptions);
        if (this.series && this.series.length > 0) {
            this.seriesInstances = [];
            this.series.forEach((s) => {
                this.addSeriesInstance(s);
            });
        } else {
            this.addSeriesAndData(this.type, this.seriesOptions, this.data);
        }
        this.resizeHandler(this.$refs.chartContainer);
        this.chart.timeScale().fitContent();
        if (this.autosize) {
            this.resizeListener = () => {
                this.resizeHandler(this.$refs.chartContainer);
            };
            window.addEventListener('resize', this.resizeListener);
        }
    },
    unmounted() {
        if (this.chart) {
            this.chart.remove();
            this.chart = null;
        }
        if (this.seriesInstance) {
            this.seriesInstance = null;
        }
        if (this.resizeListener) {
            window.removeEventListener('resize', this.resizeListener);
        }
    },
    watch: {
        series: {
            handler(newSeries) {
                if (this.seriesInstances) {
                    this.seriesInstances.forEach((s) => this.chart.removeSeries(s));
                    this.seriesInstances = [];
                }
                if (newSeries && newSeries.length > 0) {
                    newSeries.forEach((s) => this.addSeriesInstance(s));
                }
            },
            deep: true,
        },
        type() {
            if (this.series && this.series.length > 0) return;
            if (this.seriesInstance && this.chart) {
                this.chart.removeSeries(this.seriesInstance);
            }
            this.addSeriesAndData(this.type, this.seriesOptions, this.data);
        },
        data(newData) {
            if (this.series && this.series.length > 0) return;
            if (!this.seriesInstance) return;
            this.seriesInstance.setData(newData);
        },
        chartOptions(newOptions) {
            if (!this.chart) return;
            this.chart.applyOptions(newOptions);
        },
        seriesOptions(newOptions) {
            if (this.series && this.series.length > 0) return;
            if (!this.seriesInstance) return;
            this.seriesInstance.applyOptions(newOptions);
        },
    },
    methods: {
        addSeriesInstance(seriesConfig) {
            const { type, data, options, primitives } = seriesConfig;
            const seriesDefinition = getChartSeriesDefinition(type);
            const series = this.chart.addSeries(seriesDefinition, options);
            series.setData(data);
            if (Array.isArray(primitives) && primitives.length > 0) {
                primitives.forEach((p) => {
                    try {
                        series.attachPrimitive(p);
                    } catch {}
                });
            }
            if (!this.seriesInstances) this.seriesInstances = [];
            this.seriesInstances.push(series);
            return series;
        },
        addSeriesAndData(type, seriesOptions, data) {
            const seriesDefinition = getChartSeriesDefinition(type);
            this.seriesInstance = this.chart.addSeries(seriesDefinition, seriesOptions);
            this.seriesInstance.setData(data);
        },
        resizeHandler(container) {
            if (!this.chart || !container) return;
            const dimensions = container.getBoundingClientRect();
            this.chart.resize(dimensions.width, dimensions.height);
        },
    },
};
</script>

<template>
    <div class="lw-chart" ref="chartContainer"></div>
</template>

<style scoped>
.lw-chart {
    height: 100%;
    width: 100%;
}
</style>

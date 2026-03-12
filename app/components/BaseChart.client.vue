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
    },
    mounted() {
        this.chart = createChart(this.$refs.chartContainer, this.chartOptions);
        this.addSeriesAndData(this.type, this.seriesOptions, this.data);
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
        if (this.series) {
            this.series = null;
        }
        if (this.resizeListener) {
            window.removeEventListener('resize', this.resizeListener);
        }
    },
    watch: {
        type() {
            if (this.series && this.chart) {
                this.chart.removeSeries(this.series);
            }
            this.addSeriesAndData(this.type, this.seriesOptions, this.data);
        },
        data(newData) {
            if (!this.series) return;
            this.series.setData(newData);
        },
        chartOptions(newOptions) {
            if (!this.chart) return;
            this.chart.applyOptions(newOptions);
        },
        seriesOptions(newOptions) {
            if (!this.series) return;
            this.series.applyOptions(newOptions);
        },
    },
    methods: {
        addSeriesAndData(type, seriesOptions, data) {
            const seriesDefinition = getChartSeriesDefinition(type);
            this.series = this.chart.addSeries(seriesDefinition, seriesOptions);
            this.series.setData(data);
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

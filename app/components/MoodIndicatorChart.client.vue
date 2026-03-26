<script setup>

import { computed, markRaw, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import BaseChart from './BaseChart.client.vue';
import { btc_1y, btc_mood_index_1y } from '../constants/dummy.ts';

function createMoodPaneView(source) {
    const paneView = {
        zOrder() {
            return 'bottom';
        },
        update() {},
        renderer() {
            return {
                draw: (target) => {
                    try {
                        const params = source.param();
                        const points = source.points();
                        if (!params || !points || points.length === 0) return;
                        const { chart } = params;
                        const { minValue, maxValue } = source.range();
                        if (typeof target.useMediaCoordinateSpace !== 'function') return;
                        target.useMediaCoordinateSpace((scope) => {
                            const ctx = scope.context;
                            const height = scope.mediaSize.height;
                            ctx.save();
                            try {
                                const range = maxValue - minValue || 1;
                                const topPadding = 48;
                                const bottomPadding = 96;
                                const usableHeight = Math.max(0, height - topPadding - bottomPadding);
                                ctx.strokeStyle = 'rgba(41, 98, 255, 0.9)';
                                ctx.lineWidth = 2;
                                ctx.lineJoin = 'round';
                                ctx.lineCap = 'round';
                                let started = false;
                                ctx.beginPath();
                                for (const point of points) {
                                    const x = chart.timeScale().timeToCoordinate(point.time);
                                    if (x === null) continue;
                                    const ratio = (point.value - minValue) / range;
                                    const y = topPadding + (1 - ratio) * usableHeight;
                                    if (!started) {
                                        ctx.moveTo(x, y);
                                        started = true;
                                        continue;
                                    }
                                    ctx.lineTo(x, y);
                                }
                                ctx.stroke();
                                const hv = source.hoverTime();
                                const mv = source.valueAtHover();
                                const vText = mv == null ? '--' : mv.toFixed(2);
                                const badgeText = `Mood: ${vText}`;
                                ctx.font = '12px Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif';
                                ctx.textBaseline = 'top';
                                const metrics = ctx.measureText(badgeText);
                                const padX = 10;
                                const padY = 7;
                                const bWidth = Math.ceil(metrics.width + padX * 2);
                                const bHeight = 26;
                                const bX = 12;
                                const bY = 12;
                                const borderColor = mv == null ? 'rgba(255, 255, 255, 0.2)' : '#45B5AA';
                                const textColor = borderColor;
                                ctx.fillStyle = 'rgba(10, 10, 10, 0.65)';
                                ctx.beginPath();
                                const r = 8;
                                ctx.moveTo(bX + r, bY);
                                ctx.lineTo(bX + bWidth - r, bY);
                                ctx.arcTo(bX + bWidth, bY, bX + bWidth, bY + r, r);
                                ctx.lineTo(bX + bWidth, bY + bHeight - r);
                                ctx.arcTo(bX + bWidth, bY + bHeight, bX + bWidth - r, bY + bHeight, r);
                                ctx.lineTo(bX + r, bY + bHeight);
                                ctx.arcTo(bX, bY + bHeight, bX, bY + bHeight - r, r);
                                ctx.lineTo(bX, bY + r);
                                ctx.arcTo(bX, bY, bX + r, bY, r);
                                ctx.closePath();
                                ctx.fill();
                                ctx.strokeStyle = borderColor;
                                ctx.lineWidth = 1;
                                ctx.stroke();
                                ctx.fillStyle = textColor;
                                ctx.fillText(badgeText, bX + padX, bY + padY);
                                if (hv != null && mv != null) {
                                    const x = chart.timeScale().timeToCoordinate(hv);
                                    if (x != null) {
                                        const ratio = (mv - minValue) / range;
                                        const y = topPadding + (1 - ratio) * usableHeight;
                                        ctx.fillStyle = '#45B5AA';
                                        ctx.beginPath();
                                        ctx.arc(x, y, 3.5, 0, Math.PI * 2);
                                        ctx.fill();
                                    }
                                }
                            } finally {
                                ctx.restore();
                            }
                        });
                    } catch {
                        return;
                    }
                },
            };
        },
    };
    return paneView;
}
function createMoodIndicator(moodPoints, minValue, maxValue) {
    const state = {
        points: moodPoints,
        minValue,
        maxValue,
        param: null,
        requestUpdate: null,
        hoverTime: null,
        map: new Map(moodPoints.map((p) => [p.time, p.value])),
    };
    const resolveTime = (time) => {
        if (typeof time === 'number') return time;
        if (time && typeof time === 'object' && 'year' in time) {
            return Math.floor(Date.UTC(time.year, time.month - 1, time.day) / 1000);
        }
        return null;
    };
    const onCrosshair = (p) => {
        const t = resolveTime(p?.time);
        state.hoverTime = t;
        if (state.requestUpdate) state.requestUpdate();
    };
    const primitive = {
        attached(param) {
            state.param = param;
            state.requestUpdate = param.requestUpdate;
            if (param.chart && typeof param.chart.subscribeCrosshairMove === 'function') {
                param.chart.subscribeCrosshairMove(onCrosshair);
            }
            primitive.updateAllViews();
        },
        detached() {
            if (state.param?.chart && typeof state.param.chart.unsubscribeCrosshairMove === 'function') {
                state.param.chart.unsubscribeCrosshairMove(onCrosshair);
            }
            state.param = null;
            state.requestUpdate = null;
            state.hoverTime = null;
        },
        updateAllViews() {
            view.update();
            if (state.requestUpdate) state.requestUpdate();
        },
        paneViews() {
            return [view];
        },
        param() {
            return state.param;
        },
        points() {
            return state.points;
        },
        range() {
            return { minValue: state.minValue, maxValue: state.maxValue };
        },
        hoverTime() {
            return state.hoverTime;
        },
        valueAtHover() {
            if (state.hoverTime == null) return state.points[state.points.length - 1]?.value ?? null;
            const v = state.map.get(state.hoverTime);
            return v ?? null;
        },
    };
    const view = createMoodPaneView(primitive);
    return primitive;
}

const chartRef = ref(null);
const containerRef = ref(null);
const priceData = computed(() =>
    btc_1y.map((point) => ({
        time: Math.floor(new Date(point.timestamp).getTime() / 1000),
        value: point.price,
    }))
);
const moodData = computed(() =>
    btc_mood_index_1y.map((point) => ({
        time: Math.floor(new Date(point.timestamp).getTime() / 1000),
        value: point.value,
    }))
);
const moodMin = computed(() => Math.min(...moodData.value.map((point) => point.value)));
const moodMax = computed(() => Math.max(...moodData.value.map((point) => point.value)));
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
const priceSeries = computed(() => [
    {
        type: 'area',
        data: priceData.value,
        options: {
            lineColor: '#ff8a2b',
            topColor: 'rgba(255, 138, 43, 0.25)',
            bottomColor: 'rgba(255, 138, 43, 0)',
            lineWidth: 2,
            priceLineVisible: false,
            lastValueVisible: false,
        },
        primitives: [
            markRaw(createMoodIndicator(moodData.value, moodMin.value, moodMax.value)),
        ],
    },
]);
onMounted(async () => {
    await nextTick();
    const chart = chartRef.value?.chart;
    const container = containerRef.value;
    if (!chart || !container) return;
});
onBeforeUnmount(() => {});
</script>

<template>
    <div class="page">
        <div class="card">
            <div class="header">
                <div class="label">BTC PRICE</div>
                <div class="value">1Y</div>
            </div>
            <div class="chart-wrapper" ref="containerRef">
                <BaseChart
                    ref="chartRef"
                    :autosize="true"
                    :chart-options="chartOptions"
                    :series="priceSeries"
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
.chart-wrapper {
    height: 360px;
    width: 100%;
    position: relative;
}
.mood-line {
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 1;
}
</style>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import BaseChart from './BaseChart.client.vue';
import { btc_1y, btc_mood_index_1y } from '../constants/dummy.ts';

const chartRef = ref(null);
const containerRef = ref(null);
const detachIndicator = ref(null);

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
    },
]);

const resolveTime = (time) => {
    if (typeof time === 'number') return time;
    if (time && typeof time === 'object' && 'year' in time) {
        return Math.floor(Date.UTC(time.year, time.month - 1, time.day) / 1000);
    }
    return null;
};

const createMoodLineIndicator = (chart, container, moodPoints, moodMap, minValue, maxValue) => {
    const canvas = document.createElement('canvas');
    canvas.className = 'mood-line';
    canvas.style.position = 'absolute';
    canvas.style.inset = '0';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '3';
    container.append(canvas);

    const ctx = canvas.getContext('2d');
    let currentTime = null;
    const defaultValue = moodPoints[moodPoints.length - 1]?.value ?? null;

    const formatValue = (value) => {
        if (value === null || value === undefined) return '--';
        return value.toFixed(2);
    };

    const roundRect = (x, y, w, h, r) => {
        const radius = Math.min(r, w / 2, h / 2);
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + w - radius, y);
        ctx.arcTo(x + w, y, x + w, y + radius, radius);
        ctx.lineTo(x + w, y + h - radius);
        ctx.arcTo(x + w, y + h, x + w - radius, y + h, radius);
        ctx.lineTo(x + radius, y + h);
        ctx.arcTo(x, y + h, x, y + h - radius, radius);
        ctx.lineTo(x, y + radius);
        ctx.arcTo(x, y, x + radius, y, radius);
        ctx.closePath();
    };

    const draw = () => {
        if (!ctx) return;
        const width = Math.floor(canvas.clientWidth);
        const height = Math.floor(canvas.clientHeight);
        ctx.clearRect(0, 0, width, height);
        if (!moodPoints || moodPoints.length === 0) return;
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

        for (const point of moodPoints) {
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

        const valueAtTime = currentTime === null ? defaultValue : (moodMap.get(currentTime) ?? null);
        const badgeText = `Mood: ${formatValue(valueAtTime)}`;
        ctx.font = '12px Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif';
        ctx.textBaseline = 'top';
        const textMetrics = ctx.measureText(badgeText);
        const badgePaddingX = 10;
        const badgePaddingY = 7;
        const badgeWidth = Math.ceil(textMetrics.width + badgePaddingX * 2);
        const badgeHeight = 26;
        const badgeX = 12;
        const badgeY = 12;
        ctx.fillStyle = 'rgba(10, 10, 10, 0.65)';
        roundRect(badgeX, badgeY, badgeWidth, badgeHeight, 8);
        ctx.fill();
        ctx.strokeStyle = valueAtTime === null ? 'rgba(255, 255, 255, 0.2)' : "#45B5AA";
        ctx.lineWidth = 1;
        roundRect(badgeX, badgeY, badgeWidth, badgeHeight, 8);
        ctx.stroke();
        ctx.fillStyle = valueAtTime === null ? 'rgba(255, 255, 255, 0.2)' : "#45B5AA";
        ctx.fillText(badgeText, badgeX + badgePaddingX, badgeY + badgePaddingY);

        if (currentTime === null) return;
        const pointValue = moodMap.get(currentTime);
        if (pointValue === undefined) return;
        const x = chart.timeScale().timeToCoordinate(currentTime);
        if (x === null) return;
        const ratio = (pointValue - minValue) / range;
        const y = topPadding + (1 - ratio) * usableHeight;
        ctx.fillStyle = "#45B5AA";
        ctx.beginPath();
        ctx.arc(x, y, 3.5, 0, Math.PI * 2);
        ctx.fill();
    };

    const resize = () => {
        const { width, height } = container.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        const nextWidth = Math.max(0, Math.floor(width));
        const nextHeight = Math.max(0, Math.floor(height));
        const scaledWidth = Math.max(0, Math.floor(nextWidth * dpr));
        const scaledHeight = Math.max(0, Math.floor(nextHeight * dpr));
        if (canvas.width !== scaledWidth) canvas.width = scaledWidth;
        if (canvas.height !== scaledHeight) canvas.height = scaledHeight;
        canvas.style.width = `${nextWidth}px`;
        canvas.style.height = `${nextHeight}px`;
        if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        draw();
    };

    const onCrosshairMove = (param) => {
        currentTime = resolveTime(param.time);
        draw();
    };

    const onRangeChange = () => {
        draw();
    };

    chart.subscribeCrosshairMove(onCrosshairMove);
    chart.timeScale().subscribeVisibleLogicalRangeChange(onRangeChange);
    window.addEventListener('resize', resize);
    resize();

    return () => {
        chart.unsubscribeCrosshairMove(onCrosshairMove);
        chart.timeScale().unsubscribeVisibleLogicalRangeChange(onRangeChange);
        window.removeEventListener('resize', resize);
        canvas.remove();
    };
};

onMounted(async () => {
    await nextTick();
    const chart = chartRef.value?.chart;
    const container = containerRef.value;
    if (!chart || !container) return;
    const moodPoints = moodData.value;
    const moodMap = new Map(moodPoints.map((point) => [point.time, point.value]));
    detachIndicator.value = createMoodLineIndicator(
        chart,
        container,
        moodPoints,
        moodMap,
        moodMin.value,
        moodMax.value
    );
});

onBeforeUnmount(() => {
    if (detachIndicator.value) {
        detachIndicator.value();
        detachIndicator.value = null;
    }
});
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

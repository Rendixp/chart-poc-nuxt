<script setup>
import { btc_1y, polypad_1y, doge_1y, eth_1y, hbar_1y } from './constants/dummy.ts';
</script>

<template>
    <PriceChart />
    <CandlestickChart />
    <PriceChart :datasets="[btc_1y, polypad_1y]" />
    <DualPriceChart :datasets="[btc_1y, polypad_1y, doge_1y, eth_1y, hbar_1y]" />
</template>

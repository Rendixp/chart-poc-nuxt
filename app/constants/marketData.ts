export function generateCandlestickData(numberOfPoints = 100) {
    let data = [];
    let time = new Date('2025-01-01').getTime() / 1000;
    let value = 100;

    for (let i = 0; i < numberOfPoints; i++) {
        const open = value;
        const volatility = 5;
        const change = (Math.random() - 0.5) * volatility;
        const close = open + change;
        const high = Math.max(open, close) + Math.random() * 2;
        const low = Math.min(open, close) - Math.random() * 2;
        
        // Ensure high/low enclose open/close
        const finalHigh = Math.max(high, open, close);
        const finalLow = Math.min(low, open, close);

        data.push({
            time: time + i * 86400,
            open: open,
            high: finalHigh,
            low: finalLow,
            close: close,
        });

        value = close;
    }
    return data;
}

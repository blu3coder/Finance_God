import React, { useEffect, useMemo, useRef } from "react";
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
} from "lightweight-charts";

function ema(values, period) {
  const k = 2 / (period + 1);
  const out = [];
  let prev = values[0];
  out.push(prev);
  for (let i = 1; i < values.length; i++) {
    const next = values[i] * k + prev * (1 - k);
    out.push(next);
    prev = next;
  }
  return out;
}

function computeMACD(closes, fast = 12, slow = 26, signal = 9) {
  const emaFast = ema(closes, fast);
  const emaSlow = ema(closes, slow);
  const macdLine = closes.map((_, i) => emaFast[i] - emaSlow[i]);
  const signalLine = ema(macdLine, signal);
  const hist = macdLine.map((v, i) => v - signalLine[i]);
  return { macdLine, signalLine, hist };
}

function makeDummyOHLC(count = 140) {
  const start = Math.floor(Date.now() / 1000) - count * 60 * 15; // 15-min bars
  let price = 16.8;
  const bars = [];

  for (let i = 0; i < count; i++) {
    const t = start + i * 60 * 15;

    const drift = i < 70 ? -0.02 : 0.015;
    const noise = (Math.sin(i * 0.7) + Math.cos(i * 0.17)) * 0.01;

    const open = price;
    let close = price + drift + noise;

    if (i > 35 && i < 50) close -= 0.03;

    const high = Math.max(open, close) + 0.05 + Math.abs(Math.sin(i)) * 0.02;
    const low = Math.min(open, close) - 0.05 - Math.abs(Math.cos(i)) * 0.02;

    const volume = Math.floor(
      80000 + Math.abs(Math.sin(i * 0.4)) * 180000 + (i > 35 && i < 55 ? 220000 : 0)
    );

    bars.push({
      time: t,
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(close.toFixed(2)),
      volume,
    });

    price = close;
  }

  return bars;
}

export default function CandleMacdChart() {
  const topRef = useRef(null);
  const bottomRef = useRef(null);

  const data = useMemo(() => makeDummyOHLC(160), []);
  const closes = useMemo(() => data.map((d) => d.close), [data]);
  const macd = useMemo(() => computeMACD(closes, 12, 26, 9), [closes]);

  const candleData = useMemo(
    () =>
      data.map((d) => ({
        time: d.time,
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
      })),
    [data]
  );

  const volumeData = useMemo(
    () =>
      data.map((d) => ({
        time: d.time,
        value: d.volume,
        color: d.close >= d.open ? "rgba(34,197,94,0.6)" : "rgba(239,68,68,0.6)",
      })),
    [data]
  );

  const macdLineData = useMemo(
    () => data.map((d, i) => ({ time: d.time, value: macd.macdLine[i] })),
    [data, macd]
  );

  const signalLineData = useMemo(
    () => data.map((d, i) => ({ time: d.time, value: macd.signalLine[i] })),
    [data, macd]
  );

  const macdHistData = useMemo(
    () =>
      data.map((d, i) => ({
        time: d.time,
        value: macd.hist[i],
        color: macd.hist[i] >= 0 ? "rgba(34,197,94,0.6)" : "rgba(239,68,68,0.6)",
      })),
    [data, macd]
  );

  useEffect(() => {
    if (!topRef.current || !bottomRef.current) return;

    // ---- TOP CHART
    const topChart = createChart(topRef.current, {
      height: 420,
      layout: { background: { color: "#ffffff" }, textColor: "#111827" },
      grid: { vertLines: { color: "#f3f4f6" }, horzLines: { color: "#f3f4f6" } },
      timeScale: { borderColor: "#e5e7eb" },
      rightPriceScale: { borderColor: "#e5e7eb" },
      crosshair: { mode: 1 },
    });

    const candleSeries = topChart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderUpColor: "#22c55e",
      borderDownColor: "#ef4444",
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
    });

    const volumeSeries = topChart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "",
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    candleSeries.setData(candleData);
    volumeSeries.setData(volumeData);

    // ---- BOTTOM CHART (MACD)
    const bottomChart = createChart(bottomRef.current, {
      height: 220,
      layout: { background: { color: "#ffffff" }, textColor: "#111827" },
      grid: { vertLines: { color: "#f3f4f6" }, horzLines: { color: "#f3f4f6" } },
      timeScale: { borderColor: "#e5e7eb" },
      rightPriceScale: { borderColor: "#e5e7eb" },
      crosshair: { mode: 1 },
    });

    const histSeries = bottomChart.addSeries(HistogramSeries, {
      priceScaleId: "right",
      scaleMargins: { top: 0.2, bottom: 0.2 },
    });

    const macdSeries = bottomChart.addSeries(LineSeries, {
      color: "#2563eb",
      lineWidth: 2,
    });

    const signalSeries = bottomChart.addSeries(LineSeries, {
      color: "#f59e0b",
      lineWidth: 2,
    });

    histSeries.setData(macdHistData);
    macdSeries.setData(macdLineData);
    signalSeries.setData(signalLineData);

    // ---- Sync time scale between charts
    const syncFromTop = () => {
      const range = topChart.timeScale().getVisibleLogicalRange();
      if (range) bottomChart.timeScale().setVisibleLogicalRange(range);
    };
    const syncFromBottom = () => {
      const range = bottomChart.timeScale().getVisibleLogicalRange();
      if (range) topChart.timeScale().setVisibleLogicalRange(range);
    };

    topChart.timeScale().subscribeVisibleLogicalRangeChange(syncFromTop);
    bottomChart.timeScale().subscribeVisibleLogicalRangeChange(syncFromBottom);

    topChart.timeScale().fitContent();
    bottomChart.timeScale().fitContent();

    // Resize
    const roTop = new ResizeObserver(() => {
      topChart.applyOptions({ width: topRef.current.clientWidth });
    });
    const roBottom = new ResizeObserver(() => {
      bottomChart.applyOptions({ width: bottomRef.current.clientWidth });
    });

    roTop.observe(topRef.current);
    roBottom.observe(bottomRef.current);

    return () => {
      roTop.disconnect();
      roBottom.disconnect();
      topChart.remove();
      bottomChart.remove();
    };
  }, [candleData, volumeData, macdHistData, macdLineData, signalLineData]);

  return (
  <div style={{ background: "#f9fafb" }}>
    <div style={{ padding: 12 }}>
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 20, fontWeight: 800 }}>
          Candles + Volume + MACD (demo)
        </div>
        <div style={{ fontSize: 12, color: "#6b7280" }}>
          Dummy 15-min bars. Next step: plug in live data.
        </div>
      </div>

      {/* Full-width chart stack */}
      <div style={{ Width: "100%" }}>
        <div ref={topRef} style={{ width: "100%" }} />
        <div style={{ height: 1, background: "#e5e7eb" }} />
        <div ref={bottomRef} style={{ width: "100%" }} />
      </div>
    </div>
  </div>
);
}
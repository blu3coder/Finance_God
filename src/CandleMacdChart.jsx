import React, { useEffect, useMemo, useRef, useState } from "react";
import { historicalData } from "/src/historicalData.js";
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
} from "lightweight-charts";
import { useAlSocketInfo } from "./AlpacaConnection";

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

function updateAggregatedCandles(prevCandles, oneMinuteBar, timeframe) {
  const rawTime = Math.floor(new Date(oneMinuteBar.t).getTime() / 1000);
  if (!Number.isFinite(rawTime)) return prevCandles;

  const bucketTime = floorToXMinuteBucket(rawTime, timeframe);

  const incomingAggregatedCandle = {
    time: bucketTime,
    open: Number(oneMinuteBar.o ?? 0),
    high: Number(oneMinuteBar.h ?? 0),
    low: Number(oneMinuteBar.l ?? 0),
    close: Number(oneMinuteBar.c ?? 0),
    volume: Number(oneMinuteBar.v ?? 0),
  };

  if (prevCandles.length === 0) {
    return [incomingAggregatedCandle];
  }

  const last = prevCandles[prevCandles.length - 1];

  // same bucket -> update last aggregated candle
  if (last.time === bucketTime) {
    const updatedLast = {
      ...last,
      high: Math.max(last.high, incomingAggregatedCandle.high),
      low: Math.min(last.low, incomingAggregatedCandle.low),
      close: incomingAggregatedCandle.close,
      volume: (last.volume ?? 0) + (incomingAggregatedCandle.volume ?? 0),
    };

    return [...prevCandles.slice(0, -1), updatedLast];
  }

  // new bucket -> append new aggregated candle
  if (bucketTime > last.time) {
    return [...prevCandles, incomingAggregatedCandle];
  }

  // older bar -> ignore
  return prevCandles;
}

function floorToXMinuteBucket(unixSeconds, timeframe) {
  let bucketSize;

  switch (timeframe) {
    case "5Min":
      bucketSize = 5 * 60;
      break;
    case "15Min":
      bucketSize = 15 * 60;
      break;
    case "30Min":
      bucketSize = 30 * 60;
      break;
    case "1Hr":
      bucketSize = 60 * 60;
      break;
    case "4Hr":
      bucketSize = 4 * 60 * 60;
      break;
    case "1Min":
    default:
      bucketSize = 60;
      break;
  }

  return Math.floor(unixSeconds / bucketSize) * bucketSize;
}



export default function CandleMacdChart(stockName, dateRange, timeframe) {
  const { dictStock } = useAlSocketInfo();
  const topRef = useRef(null);
  const bottomRef = useRef(null);

    const [candles, setCandles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

    useEffect(() => {
    async function loadBars() {
      try {
        setLoading(true);
        setError("");

        const bars = await historicalData("NVDX", "bars", dateRange, timeframe);
        setCandles(bars);
      } catch (err) {
        console.error(err);
        setError("Failed to load historical bars");
      } finally {
        setLoading(false);
      }
    }

    loadBars();
  }, [stockName,dateRange,timeframe]);

  useEffect(() => {
    const bars = dictStock?.[stockName];
    if (!bars || bars.length === 0) return;

    const latestBar = bars[bars.length - 1];
    if (!latestBar?.t) return;

    setCandles((prev) => updateAggregatedCandles(prev, latestBar, timeframe));
  }, [dictStock, stockName, timeframe]);
  
  const closes = useMemo(() => candles.map((c) => c.close), [candles]);
  const macd = useMemo(() => {
    if (closes.length === 0) {
      return { macdLine: [], signalLine: [], hist: [] };
    }
    return computeMACD(closes, 12, 26, 9);
  }, [closes]);

  

  const volumeData = useMemo(
    () =>
      candles.map((c) => ({
        time: d.time,
        value: d.volume,
        color: d.close >= d.open ? "rgba(34,197,94,0.6)" : "rgba(239,68,68,0.6)",
      })),
    [candles]
  );

  const macdLineData = useMemo(
    () => candles.map((c, i) => ({ time: c.time, value: macd.macdLine[i] })),
    [candles, macd]
  );

  const signalLineData = useMemo(
    () => candles.map((c, i) => ({ time: c.time, value: macd.signalLine[i] })),
    [candles, macd]
  );

  const macdHistData = useMemo(
    () =>
      candles.map((c, i) => ({
        time: c.time,
        value: macd.hist[i],
        color: macd.hist[i] >= 0 ? "rgba(34,197,94,0.6)" : "rgba(239,68,68,0.6)",
      })),
    [candles, macd]
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


    const volumeSeries = topChart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "",
      scaleMargins: { top: 0.8, bottom: 0 },
    });

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
  }, [volumeData, macdHistData, macdLineData, signalLineData]);

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
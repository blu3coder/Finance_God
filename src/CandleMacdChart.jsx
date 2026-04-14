import React, { useEffect, useRef, useState } from "react";
import { createChart, LineSeries, HistogramSeries } from "lightweight-charts";
import { DateTime } from "luxon";
import { useAlSocketInfo } from "./AlpacaConnection";

export default function CandleMacdChart({ stockName = "NVDX", timeframe, dateRange }) {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const macdLineSeriesRef = useRef(null);
  const histogramSeriesRef = useRef(null);

  const { dictStock } = useAlSocketInfo();
  const [candles, setCandles] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");

  // ── create chart once ────────────────────────────────────────────────────
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth || 700,
  height: 300,
  localization: {
    timeFormatter: (time) =>
      DateTime.fromSeconds(time, { zone: "America/New_York" }).toFormat("MM/dd HH:mm"),
  },
  timeScale: {
    visible: true,
    timeVisible: true,
    secondsVisible: true,
    barSpacing: 10,
    tickMarkFormatter: (time) =>
      DateTime.fromSeconds(time, { zone: "America/New_York" }).toFormat("HH:mm"),
  },
      grid: {
        vertLines: { color: "#eeeeee" },
        horzLines: { color: "#eeeeee" },
      },
    });

    // Histogram drawn first so the MACD line renders on top
    const histogramSeries = chart.addSeries(HistogramSeries, {
      color: "#26a69a",
      priceFormat: { type: "price", precision: 4, minMove: 0.0001 },
      priceScaleId: "right",
      base: 0,
    });

    const macdLineSeries = chart.addSeries(LineSeries, {
      color: "#2962FF",
      lineWidth: 2,
      priceFormat: { type: "price", precision: 4, minMove: 0.0001 },
      priceScaleId: "right",
      lastValueVisible: true,
      crosshairMarkerVisible: true,
    });

    chartRef.current = chart;
    macdLineSeriesRef.current = macdLineSeries;
    histogramSeriesRef.current = histogramSeries;

    const resizeObserver = new ResizeObserver(() => {
      if (!chartContainerRef.current || !chartRef.current) return;
      chartRef.current.applyOptions({
        width: chartContainerRef.current.clientWidth,
      });
    });
    resizeObserver.observe(chartContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      macdLineSeriesRef.current = null;
      histogramSeriesRef.current = null;
    };
  }, []);

  // ── load historical candles on symbol / range / timeframe change ─────────
  useEffect(() => {
    let ignore = false;

    async function loadHistoricalData() {
      try {
        setHistoryLoading(true);
        setHistoryError("");
        const history = await getHistoricalBars(stockName, dateRange, timeframe);
        if (!ignore) setCandles(history);
      } catch (err) {
        if (!ignore) {
          setHistoryError(err.message || "Failed to load historical data");
          setCandles([]);
        }
      } finally {
        if (!ignore) setHistoryLoading(false);
      }
    }

    loadHistoricalData();
    return () => { ignore = true; };
  }, [stockName, dateRange, timeframe]);

  // ── merge live websocket bars into candles ───────────────────────────────
  useEffect(() => {
    const bars = dictStock?.[stockName];
    if (!bars || bars.length === 0) return;

    const latestBar = bars[bars.length - 1];
    if (!latestBar?.t) return;

    setCandles((prev) => updateAggregatedCandles(prev, latestBar, timeframe));
  }, [dictStock, dateRange, stockName, timeframe]);

  // ── compute MACD and push to chart whenever candles change ───────────────
  useEffect(() => {
    if (!macdLineSeriesRef.current || !histogramSeriesRef.current) return;
    if (candles.length === 0) {
      macdLineSeriesRef.current.setData([]);
      histogramSeriesRef.current.setData([]);
      return;
    }

    const { macdLine, histogram } = computeMacd(candles);

    macdLineSeriesRef.current.setData(macdLine);
    histogramSeriesRef.current.setData(histogram);

    if (macdLine.length > 0) {
      chartRef.current?.timeScale().fitContent();
    }
  }, [candles]);

  return (
    <div>
      <div ref={chartContainerRef} style={{ width: "700px", height: "300px" }} />
      <p>Symbol: {stockName}</p>
      <p>Range: {dateRange}</p>
      <p>History loading: {historyLoading ? "yes" : "no"}</p>
      {historyError && <p style={{ color: "red" }}>{historyError}</p>}
    </div>
  );
}

// ── MACD calculation ─────────────────────────────────────────────────────────
// Returns { macdLine: [{time, value}], histogram: [{time, value, color}] }
function computeMacd(candles, fastLen = 5, slowLen = 10, signalLen = 3) {
  if (candles.length < slowLen) return { macdLine: [], histogram: [] };

  const closes = candles.map((c) => c.close);

  const ema12 = calcEma(closes, fastLen);
  const ema26 = calcEma(closes, slowLen);

  // MACD values only exist where both EMAs are defined (i.e. from index slowLen-1 onward)
  const offset = slowLen - 1;
  const macdValues = ema12.slice(offset - (fastLen - 1)).map((v, i) => v - ema26[i]);

  // Signal line = EMA-9 of macdValues
  const signalValues = calcEma(macdValues, signalLen);
  const signalOffset = signalLen - 1;

  const macdLine = [];
  const histogram = [];

  for (let i = signalOffset; i < macdValues.length; i++) {
    const candleIndex = offset + i;
    if (candleIndex >= candles.length) break;

    const time = candles[candleIndex].time;
    const macdVal = macdValues[i];
    const sigVal = signalValues[i - signalOffset];
    const histVal = macdVal - sigVal;

    macdLine.push({ time, value: macdVal });
    histogram.push({
      time,
      value: histVal,
      color: histVal >= 0 ? "#26a69a" : "#ef5350",
    });
  }

  return { macdLine, histogram };
}

// Standard Wilder/EMA using a multiplier of 2/(n+1)
function calcEma(values, period) {
  if (values.length < period) return [];

  const k = 2 / (period + 1);
  const result = [];

  // Seed with SMA of the first `period` values
  const seed = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  result.push(seed);

  for (let i = period; i < values.length; i++) {
    result.push(values[i] * k + result[result.length - 1] * (1 - k));
  }

  return result;
}

// ── helpers (identical to CandleChart) ───────────────────────────────────────
async function getHistoricalBars(symbol, dateRange, timeframe2) {
  const { startISO, endISO, timeframe } = getRangeConfig(dateRange, timeframe2);

  const params = new URLSearchParams({
    symbols: symbol,
    timeframe,
    start: startISO,
    end: endISO,
    limit: "10000",
    sort: "asc",
    feed: "iex",
  });

  const url = `https://data.alpaca.markets/v2/stocks/bars?${params.toString()}`;
  const response = await fetch(url, {
    headers: {
      "APCA-API-KEY-ID": import.meta.env.VITE_ALPACA_KEY,
      "APCA-API-SECRET-KEY": import.meta.env.VITE_ALPACA_SECRET,
    },
  });

  if (!response.ok) throw new Error(`Request failed: ${response.status}`);

  const data = await response.json();
  console.log(data)
  const bars = data.bars?.[symbol] ?? [];

  return bars.map((bar) => ({
    time: Math.floor(new Date(bar.t).getTime() / 1000),
    open: Number(bar.o ?? 0),
    high: Number(bar.h ?? 0),
    low: Number(bar.l ?? 0),
    close: Number(bar.c ?? 0),
  }));
}

function getRangeConfig(dateRange, timeframe2) {
  const nowNY = DateTime.now().setZone("America/New_York");
  let startNY;

  switch (dateRange) {
    case "1Day":
      startNY = nowNY.minus({ days: 1 }).set({ hour: 20, minute: 0, second: 0, millisecond: 0 });
      break;
    case "1Week":
      startNY = nowNY.minus({ days: 7 }).set({ hour: 20, minute: 0, second: 0, millisecond: 0 });
      break;
    case "1Month":
      startNY = nowNY.minus({ months: 1 }).set({ hour: 20, minute: 0, second: 0, millisecond: 0 });
      break;
    case "1Year":
      startNY = nowNY.minus({ years: 1 }).set({ hour: 20, minute: 0, second: 0, millisecond: 0 });
      break;
    case "YTD":
      startNY = nowNY.startOf("year").set({ hour: 20, minute: 0, second: 0, millisecond: 0 });
      break;
    default:
      startNY = nowNY.minus({ days: 1 }).set({ hour: 20, minute: 0, second: 0, millisecond: 0 });
  }

  return { startISO: startNY.toUTC().toISO(), endISO: nowNY.toUTC().toISO(), timeframe: timeframe2 };
}

function floorToXMinuteBucket(unixSeconds, timeframe) {
  const sizes = { "5Min": 300, "15Min": 900, "30Min": 1800, "1Hr": 3600, "4Hr": 14400, "1Min": 60 };
  const bucketSize = sizes[timeframe] ?? 60;
  return Math.floor(unixSeconds / bucketSize) * bucketSize;
}

function updateAggregatedCandles(prevCandles, oneMinuteBar, timeframe) {
  const rawTime = Math.floor(new Date(oneMinuteBar.t).getTime() / 1000);
  if (!Number.isFinite(rawTime)) return prevCandles;

  const bucketTime = floorToXMinuteBucket(rawTime, timeframe);

  const incoming = {
    time: bucketTime,
    open: Number(oneMinuteBar.o ?? 0),
    high: Number(oneMinuteBar.h ?? 0),
    low: Number(oneMinuteBar.l ?? 0),
    close: Number(oneMinuteBar.c ?? 0),
    volume: Number(oneMinuteBar.v ?? 0),
  };

  if (prevCandles.length === 0) return [incoming];

  const last = prevCandles[prevCandles.length - 1];

  if (last.time === bucketTime) {
    return [
      ...prevCandles.slice(0, -1),
      {
        ...last,
        high: Math.max(last.high, incoming.high),
        low: Math.min(last.low, incoming.low),
        close: incoming.close,
        volume: (last.volume ?? 0) + (incoming.volume ?? 0),
      },
    ];
  }

  if (bucketTime > last.time) return [...prevCandles, incoming];
  return prevCandles;
}
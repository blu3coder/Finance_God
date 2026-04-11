import React, { useEffect, useRef, useState } from "react";
import { createChart, CandlestickSeries } from "lightweight-charts";
import { DateTime } from "luxon";
import { useAlSocketInfo } from "./AlpacaConnection";

export default function CandleChart({ stockName, timeframe="15min", dateRange = "1Day" }) {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const candleSeriesRef = useRef(null);

  const { dictStock, closeWs } = useAlSocketInfo();
  const [candles, setCandles] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");

  // create chart once
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth || 700,
      height: 400,
      layout: {
        background: { color: "#ffffff" },
        textColor: "#222",
      },
      rightPriceScale: {
        visible: true,
      },
      leftPriceScale: {
        visible: false,
      },
      timeScale: {
        visible: true,
        timeVisible: true,
        secondsVisible: true,
        barSpacing: 10,
      },
      grid: {
        vertLines: { color: "#eeeeee" },
        horzLines: { color: "#eeeeee" },
      },
    });

    const candleSeries = chart.addSeries(CandlestickSeries);

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;

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
      candleSeriesRef.current = null;
    };
  }, []);

  // load historical candles whenever symbol or date range changes
  useEffect(() => {
    let ignore = false;

    async function loadHistoricalData() {
      try {
        setHistoryLoading(true);
        setHistoryError("");

        const history = await getHistoricalBars(stockName, dateRange, timeframe);

        if (!ignore) {
          setCandles(history);
          
        }
      } catch (err) {
        if (!ignore) {
          setHistoryError(err.message || "Failed to load historical data");
          setCandles([]);
        }
      } finally {
        if (!ignore) {
          setHistoryLoading(false);
        }
      }
    }

    loadHistoricalData();

    return () => {
      ignore = true;
    };
  }, [stockName, dateRange, timeframe]);

  // merge newest live websocket bar into candles
  useEffect(() => {
  const bars = dictStock?.[stockName];
  if (!bars || bars.length === 0) return;

  const latestBar = bars[bars.length - 1];
  if (!latestBar?.t) return;

  setCandles((prev) => updateAggregatedCandles(prev, latestBar, timeframe));
}, [dictStock, stockName, timeframe]);

  // draw all candles currently in state
  useEffect(() => {
    if (!candleSeriesRef.current) return;

    candleSeriesRef.current.setData(candles);

    if (candles.length > 0) {
      chartRef.current?.timeScale().fitContent();
    }
  }, [candles]);

  return (
    <div>
      <div
        ref={chartContainerRef}
        style={{
          width: "700px",
          height: "400px",
        }}
      />

      <div style={{ marginTop: "12px" }}>
        <button onClick={closeWs}>Close connection</button>
      </div>

      <p>Symbol: {stockName}</p>
      <p>Range: {dateRange}</p>
      <p>History loading: {historyLoading ? "yes" : "no"}</p>
      {historyError && <p style={{ color: "red" }}>{historyError}</p>}
    </div>
  );
}

async function getHistoricalBars(symbol, dateRange = "1Day", timeframe2) {
  const { startISO, endISO, timeframe } = getRangeConfig(dateRange, timeframe2);

  const params = new URLSearchParams({
    symbols: "NVDX",
    timeframe,
    start: startISO,
    end: endISO,
    limit: "10000",
    sort: "asc",
    feed: "iex",
  });
  console.log("startISO:", startISO);
  console.log("endISO:", endISO);
  console.log("timeframe:", timeframe);

  const url = `https://data.alpaca.markets/v2/stocks/bars?${params.toString()}`;
  console.log("url ",url);
  const response = await fetch(url, {
    headers: {
      "APCA-API-KEY-ID": import.meta.env.VITE_ALPACA_KEY,
      "APCA-API-SECRET-KEY": import.meta.env.VITE_ALPACA_SECRET,
    },
  });
  console.log(response);

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  const data = await response.json();
  console.log("Json data: ", data)
  const bars = data.bars?.["NVDX"] ?? [];
  console.log("bars: ",bars)

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
  let timeframe = timeframe2;

  switch (dateRange) {
    case "1Day":
      startNY = nowNY.minus({ days: 1 }).set({
        hour: 20,
        minute: 0,
        second: 0,
        millisecond: 0,
      });
      timeframe = "1Min";
      break;

    case "1Week":
      startNY = nowNY.minus({ days: 7 }).set({
        hour: 20,
        minute: 0,
        second: 0,
        millisecond: 0,
      });
      timeframe = "5Min";
      break;

    case "1Month":
      startNY = nowNY.minus({ months: 1 }).set({
        hour: 20,
        minute: 0,
        second: 0,
        millisecond: 0,
      });
      timeframe = "15Min";
      break;

    case "1Year":
      startNY = nowNY.minus({ years: 1 }).set({
        hour: 20,
        minute: 0,
        second: 0,
        millisecond: 0,
      });
      timeframe = "1Day";
      break;

    case "YTD":
      startNY = nowNY.startOf("year").set({
        hour: 20,
        minute: 0,
        second: 0,
        millisecond: 0,
      });
      timeframe = "1Day";
      break;

    default:
      startNY = nowNY.minus({ days: 1 }).set({
        hour: 20,
        minute: 0,
        second: 0,
        millisecond: 0,
      });
      timeframe = "1Min";
  }

  return {
    startISO: startNY.toUTC().toISO(),
    endISO: nowNY.toUTC().toISO(),
    timeframe,
  };
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



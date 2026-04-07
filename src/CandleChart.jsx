import React, { useState, useEffect, useRef } from "react";
import { createChart, CandlestickSeries } from "lightweight-charts";
import useQuote from "./MessagBox";
import ErrorBoundary from "./ErrorBoundary";
import { useAlSocketInfo } from "./AlpacaConnection";

export default function CandleChart({ stockName }) {
  const chartContainerRef = useRef(null); //points to the html div in the page later in jsx <div ref=chartcontainer ref / mounting  / measuring wifth and height / resize logic
  const chartRef = useRef(null); //ref that stores the chart instace so it survives re renders - the actual chart object //chart wide options / time scale methods /removing the chart
  const candleSeriesRef = useRef(null); //points to the candle series object inside the chart - this is the part of the chart where candle datagoes //seting candle data //updating live candles

  const [returnedValue, setReturnedValue] = useState("");
  const [isLoud, setIsLoud] = useState(false);
  const { quote, loading, error } = useQuote(stockName);
  const { dictStock, status, closeWs } = useAlSocketInfo();
  const [candles, setCandles] = useState([]);

  // Create chart only once
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      width: 700,
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
        barSpacing: 40,
      },
      grid: {
        vertLines: { color: "#eeeeee" },
        horzLines: { color: "#eeeeee" },
      },
    });

    const candleSeries = chart.addSeries(CandlestickSeries);

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;

    // optional starter candle
    candleSeries.setData([
      {
        time: 1711099800,
        open: 0,
        high: 0,
        low: 0,
        close: 0,
      },
    ]);

    chart.timeScale().fitContent();

    const resizeObserver = new ResizeObserver(() => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    });

    resizeObserver.observe(chartContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
    };
  }, []);

  // Update chart when dictStock changes
  useEffect(() => {
    const bars = dictStock?.["FAKEPACA"];
    if (!bars || bars.length === 0) return;
    if (!candleSeriesRef.current) return;

    const bar = bars[bars.length - 1];

    if (!bar?.t) return;

    const newCandle = {
      time: Math.floor(new Date(bar.t).getTime() / 1000),
      open: Number(bar.o ?? 0),
      high: Number(bar.h ?? 0),
      low: Number(bar.l ?? 0),
      close: Number(bar.c ?? 0),
    };

    if (!Number.isFinite(newCandle.time)) {
      console.log("bad candle time", newCandle, bar);
      return;
    }

    setCandles((prev) => {
      if (prev.length === 0) {
        return [newCandle];
      }

      const last = prev[prev.length - 1];

      // same time -> replace last candle
      if (last.time === newCandle.time) {
        return [...prev.slice(0, -1), newCandle];
      }

      // newer time -> append
      if (newCandle.time > last.time) {
        return [...prev, newCandle];
      }

      // older time -> ignore
      return prev;
    });

    // update chart immediately with ONE candle
    candleSeriesRef.current.update(newCandle);
  }, [dictStock]);

  useEffect(() => {
    console.log("candles updated", candles);
  }, [candles]);

  return (
    <div
      ref={chartContainerRef}
      style={{
        width: "700px",
        height: "400px",
      }}
    >
      <button onClick={closeWs}>Close connection</button>
      <p>Value: {returnedValue}</p>
    </div>
  );
}
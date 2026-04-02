import React, { useState, useEffect, useRef } from "react";
import { createChart, CandlestickSeries } from "lightweight-charts";
import useQuote from "./MessagBox"

export default function CandleChart({stockName}) {
  const chartContainerRef = useRef(null);
  const [returnedValue, setReturnedValue] = useState("");
  const [isLoud, setIsLoud] = useState(false);
  const { quote, loading, error } = useQuote(stockName);

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

    candleSeries.setData([
      {
        time: 1711099800, // Unix timestamp in seconds
        open: 100,
        high: 105,
        low: 98,
        close: 103,
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
    };
  }, []);

  if (loading) return <p>Loading...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div
      ref={chartContainerRef}
      style={{
        width: "700px",
        height: "400px",
      }}
    >
        
      
     <useQuote
        name={stockName}
      />
      <p>{returnedValue}</p>
      
        </div>
  );
}
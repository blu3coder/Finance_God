import React, { useEffect, useMemo, useRef, useState } from "react";
import { DateTime } from "luxon";
import { useAlSocketInfo } from "/src/AlpacaConnection.jsx";

export function SideVolumeProfile({
  stockName = "FAKEPACA",
  timeframe = "15min",
  dateRange = "1Day",
  bucketSize = 0.05,
}) {
  const { dictTradeStock, dictQuoteStock } = useAlSocketInfo();

  const [historicalTrades, setHistoricalTrades] = useState([]);
  const [historicalQuotes, setHistoricalQuotes] = useState([]);
  const [profileVersion, setProfileVersion] = useState(0);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");

  const quoteRef = useRef({});
  const profileRef = useRef({});
  const lastProcessedTradeTimeRef = useRef({});

  useEffect(() => {
    let ignore = false;

    async function loadHistoricalData() {
      try {
        setHistoryLoading(true);
        setHistoryError("");

        const historyTrades = await getAllHistoricalTrades(stockName, dateRange);
        const historyQuotes = await getAllHistoricalQuotes(stockName, dateRange);

        if (!ignore) {
          setHistoricalTrades(historyTrades);
          setHistoricalQuotes(historyQuotes);
        }
      } catch (err) {
        if (!ignore) {
          setHistoryError(err.message || "Failed to load historical data");
          setHistoricalTrades([]);
          setHistoricalQuotes([]);
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
  }, [stockName, dateRange]);

  // Build profile from historical trades + historical quotes
  useEffect(() => {
    if (!stockName) return;

    profileRef.current[stockName] = {};
    lastProcessedTradeTimeRef.current[stockName] = 0;

    const sortedQuotes = [...historicalQuotes].sort(
      (a, b) => new Date(a.t).getTime() - new Date(b.t).getTime()
    );

    const sortedTrades = [...historicalTrades].sort(
      (a, b) => new Date(a.t).getTime() - new Date(b.t).getTime()
    );

    if (sortedQuotes.length > 0) {
      const lastQuote = sortedQuotes[sortedQuotes.length - 1];
      quoteRef.current[stockName] = {
        bid: Number(lastQuote.bp),
        ask: Number(lastQuote.ap),
        time: new Date(lastQuote.t).getTime(),
      };
    } else {
      quoteRef.current[stockName] = undefined;
    }

    if (sortedTrades.length > 0) {
      const lastTrade = sortedTrades[sortedTrades.length - 1];
      lastProcessedTradeTimeRef.current[stockName] = new Date(lastTrade.t).getTime();
    }

    buildProfileFromHistory(
      sortedTrades,
      sortedQuotes,
      profileRef.current[stockName],
      bucketSize
    );

    setProfileVersion((v) => v + 1);
  }, [stockName, historicalTrades, historicalQuotes, bucketSize]);

  // Handle incoming live quote
  useEffect(() => {
    const quotesForStock = dictQuoteStock?.[stockName];
    if (!quotesForStock || quotesForStock.length === 0) return;

    const latestQuote = quotesForStock[quotesForStock.length - 1];
    if (!latestQuote) return;

    handleQuote(latestQuote, quoteRef);
  }, [dictQuoteStock, stockName]);

  // Handle incoming live trade
  useEffect(() => {
    const tradesForStock = dictTradeStock?.[stockName];
    if (!tradesForStock || tradesForStock.length === 0) return;

    const latestTrade = tradesForStock[tradesForStock.length - 1];
    if (!latestTrade) return;

    const latestTradeTime = new Date(latestTrade.t).getTime();
    const lastProcessedTradeTime = lastProcessedTradeTimeRef.current[stockName] || 0;

    if (latestTradeTime <= lastProcessedTradeTime) return;

    if (!profileRef.current[stockName]) {
      profileRef.current[stockName] = {};
    }

    handleTrade(latestTrade, quoteRef, profileRef, bucketSize);

    lastProcessedTradeTimeRef.current[stockName] = latestTradeTime;
    setProfileVersion((v) => v + 1);
  }, [dictTradeStock, stockName, bucketSize]);

  const currentProfile = useMemo(() => {
    return profileRef.current[stockName] || {};
  }, [stockName, profileVersion]);

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <strong>{stockName}</strong> split volume profile
        <div style={{ fontSize: 12, opacity: 0.7 }}>
          timeframe: {timeframe} | range: {dateRange}
        </div>
      </div>

      {historyLoading && <div>Loading historical data...</div>}
      {historyError && <div style={{ color: "red" }}>{historyError}</div>}

      <SplitVolumeProfile profile={currentProfile} />
    </div>
  );
}

async function fetchHistoricalTradesPage(stockName, dateRange, pageToken = "") {
  const { startISO, endISO } = getRangeConfig(dateRange);

  const params = new URLSearchParams({
    symbols: stockName,
    start: startISO,
    end: endISO,
    limit: "10000",
    sort: "asc",
    feed: "iex",
  });

  if (pageToken) {
    params.set("page_token", pageToken);
  }

  const url = `https://data.alpaca.markets/v2/stocks/trades?${params.toString()}`;

  const response = await fetch(url, {
    headers: {
      "APCA-API-KEY-ID": import.meta.env.VITE_ALPACA_KEY,
      "APCA-API-SECRET-KEY": import.meta.env.VITE_ALPACA_SECRET,
    },
  });

  if (!response.ok) {
    throw new Error(`Historical trades request failed: ${response.status}`);
  }

  return response.json();
}

async function getAllHistoricalTrades(stockName, dateRange) {
  let allTrades = [];
  let nextPageToken = "";

  do {
    const data = await fetchHistoricalTradesPage(
      stockName,
      dateRange,
      nextPageToken
    );

    const pageTrades = data.trades?.[stockName] || [];
    allTrades = allTrades.concat(pageTrades);

    nextPageToken = data.next_page_token || "";
  } while (nextPageToken);

  return allTrades;
}

async function fetchHistoricalQuotesPage(stockName, dateRange, pageToken = "") {
  const { startISO, endISO } = getRangeConfig(dateRange);

  const params = new URLSearchParams({
    symbols: stockName,
    start: startISO,
    end: endISO,
    limit: "10000",
    sort: "asc",
    feed: "iex",
  });

  if (pageToken) {
    params.set("page_token", pageToken);
  }

  const url = `https://data.alpaca.markets/v2/stocks/quotes?${params.toString()}`;

  const response = await fetch(url, {
    headers: {
      "APCA-API-KEY-ID": import.meta.env.VITE_ALPACA_KEY,
      "APCA-API-SECRET-KEY": import.meta.env.VITE_ALPACA_SECRET,
    },
  });

  if (!response.ok) {
    throw new Error(`Historical quotes request failed: ${response.status}`);
  }

  return response.json();
}

async function getAllHistoricalQuotes(stockName, dateRange) {
  let allQuotes = [];
  let nextPageToken = "";

  do {
    const data = await fetchHistoricalQuotesPage(
      stockName,
      dateRange,
      nextPageToken
    );

    const pageQuotes = data.quotes?.[stockName] || [];
    allQuotes = allQuotes.concat(pageQuotes);

    nextPageToken = data.next_page_token || "";
  } while (nextPageToken);

  return allQuotes;
}

function buildProfileFromHistory(trades, quotes, profile, bucketSize = 0.05) {
  if (!Array.isArray(trades) || !Array.isArray(quotes)) return profile;

  let quoteIndex = 0;
  let currentQuote = null;

  for (const trade of trades) {
    const tradeTime = new Date(trade.t).getTime();

    while (
      quoteIndex < quotes.length &&
      new Date(quotes[quoteIndex].t).getTime() <= tradeTime
    ) {
      currentQuote = {
        bid: Number(quotes[quoteIndex].bp),
        ask: Number(quotes[quoteIndex].ap),
      };
      quoteIndex += 1;
    }

    addTradeToSplitProfile(trade, currentQuote, profile, bucketSize);
  }

  return profile;
}

function getRangeConfig(dateRange) {
  const nowNY = DateTime.now().setZone("America/New_York");

  let startNY;

  switch (dateRange) {
    case "1Day":
      startNY = nowNY.minus({ days: 1 }).set({
        hour: 20,
        minute: 0,
        second: 0,
        millisecond: 0,
      });
      break;

    case "1Week":
      startNY = nowNY.minus({ days: 7 }).set({
        hour: 20,
        minute: 0,
        second: 0,
        millisecond: 0,
      });
      break;

    case "1Month":
      startNY = nowNY.minus({ months: 1 }).set({
        hour: 20,
        minute: 0,
        second: 0,
        millisecond: 0,
      });
      break;

    case "1Year":
      startNY = nowNY.minus({ years: 1 }).set({
        hour: 20,
        minute: 0,
        second: 0,
        millisecond: 0,
      });
      break;

    case "YTD":
      startNY = nowNY.startOf("year").set({
        hour: 20,
        minute: 0,
        second: 0,
        millisecond: 0,
      });
      break;

    default:
      startNY = nowNY.minus({ days: 1 }).set({
        hour: 20,
        minute: 0,
        second: 0,
        millisecond: 0,
      });
  }

  return {
    startISO: startNY.toUTC().toISO(),
    endISO: nowNY.toUTC().toISO(),
  };
}

function addTradeToSplitProfile(trade, latestQuote, profile, bucketSize = 0.05) {
  const price = Number(trade.p);
  const size = Number(trade.s);
  const bid = Number(latestQuote?.bid);
  const ask = Number(latestQuote?.ask);

  if (!Number.isFinite(price) || !Number.isFinite(size)) return profile;

  const bucket = floorToBucket(price, bucketSize);
  const key = bucket.toFixed(2);

  if (!profile[key]) {
    profile[key] = { buy: 0, sell: 0, unknown: 0 };
  }

  const side = classifyTrade(price, bid, ask);

  if (side === "buy") profile[key].buy += size;
  else if (side === "sell") profile[key].sell += size;
  else profile[key].unknown += size;

  return profile;
}

function classifyTrade(tradePrice, bid, ask) {
  if (
    !Number.isFinite(tradePrice) ||
    !Number.isFinite(bid) ||
    !Number.isFinite(ask)
  ) {
    return "unknown";
  }

  const distToBid = Math.abs(tradePrice - bid);
  const distToAsk = Math.abs(tradePrice - ask);

  if (distToAsk < distToBid) return "buy";
  if (distToBid < distToAsk) return "sell";
  return "unknown";
}

function floorToBucket(price, bucketSize) {
  return Math.floor(price / bucketSize) * bucketSize;
}

function handleQuote(q, quoteRef) {
  if (!q?.S) return;

  quoteRef.current[q.S] = {
    bid: Number(q.bp),
    ask: Number(q.ap),
    time: new Date(q.t).getTime(),
  };
}

function handleTrade(trade, quoteRef, profileRef, bucketSize = 0.05) {
  if (!trade?.S) return;

  const symbol = trade.S;
  const quote = quoteRef.current[symbol];

  if (!profileRef.current[symbol]) {
    profileRef.current[symbol] = {};
  }

  addTradeToSplitProfile(
    trade,
    quote,
    profileRef.current[symbol],
    bucketSize
  );
}

function SplitVolumeProfile({ profile }) {
  const rows = Object.entries(profile)
    .map(([price, data]) => ({
      price: Number(price),
      buy: data.buy || 0,
      sell: data.sell || 0,
      unknown: data.unknown || 0,
    }))
    .sort((a, b) => b.price - a.price);

  if (rows.length === 0) {
    return <div>No profile rows yet</div>;
  }

  const maxVol = Math.max(...rows.map((r) => Math.max(r.buy, r.sell)), 1);

  return (
    <div>
      {rows.map((row) => (
        <div
          key={row.price}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 2,
          }}
        >
          <div
            style={{
              width: `${(row.sell / maxVol) * 120}px`,
              height: "10px",
              background: "red",
              marginLeft: "auto",
            }}
          />
          <div style={{ width: 60, textAlign: "center", fontSize: 12 }}>
            {row.price.toFixed(2)}
          </div>
          <div
            style={{
              width: `${(row.buy / maxVol) * 120}px`,
              height: "10px",
              background: "green",
            }}
          />
          <div style={{ width: 70, fontSize: 11, opacity: 0.7 }}>
            U: {row.unknown}
          </div>
        </div>
      ))}
    </div>
  );
}
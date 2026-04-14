import { DateTime } from "luxon";

export async function historicalData(stockName, specification, timeframe, dateRange) {
  if(specification == "trades"){
    getAllHistoricalTrades(stockName, dateRange);
  }
  else if(specification =="quotes"){
    getAllHistoricalQuotes(stockName, dateRange);
  }
  else if(specification == "bars"){
    getHistoricalBars(stockName, dateRange, timeframe);
  }
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

  console.log("startISO:", startISO);
  console.log("endISO:", endISO);

  if (pageToken) {
    params.set("page_token", pageToken);
  }

  const url = `https://data.alpaca.markets/v2/stocks/trades?${params.toString()}`;
  console.log("url", url);

  const response = await fetch(url, {
    headers: {
      "APCA-API-KEY-ID": import.meta.env.VITE_ALPACA_KEY,
      "APCA-API-SECRET-KEY": import.meta.env.VITE_ALPACA_SECRET,
    },
  });

  console.log(response);

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

  console.log("startISO:", startISO);
  console.log("endISO:", endISO);

  if (pageToken) {
    params.set("page_token", pageToken);
  }

  const url = `https://data.alpaca.markets/v2/stocks/quotes?${params.toString()}`;
  console.log("quote url", url);

  const response = await fetch(url, {
    headers: {
      "APCA-API-KEY-ID": import.meta.env.VITE_ALPACA_KEY,
      "APCA-API-SECRET-KEY": import.meta.env.VITE_ALPACA_SECRET,
    },
  });

  console.log(response);

  if (!response.ok) {
    throw new Error(`Historical quotes request failed: ${response.status}`);
  }

  return response.json();
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
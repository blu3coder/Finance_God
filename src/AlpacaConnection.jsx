import { createContext, useContext, useEffect, useRef, useState } from "react";
import { createSocket } from "./websocket";
import { getSocket } from "./getSocket";

const socketContext = createContext(null);

export default function AlpacaSocket({children}) {
  const socketRef = useRef(null);
  const [status, setStatus] = useState("disconnected");
  const [logs, setLogs] = useState([]);
  const [dictStock, setDictStock] = useState({ FAKEPACA: [], NVDX: [], NVDZ:[], IONQ: [], IONZ:[], QBTS: [], QBTZ:[] })
  const [dictTradeStock, setDictTradeStock] = useState({ FAKEPACA: [], NVDX: [], NVDZ:[], IONQ: [], IONZ:[], QBTS: [], QBTZ:[] })
  const [dictQuoteStock, setDictQuoteStock] = useState({ FAKEPACA: [], NVDX: [], NVDZ:[], IONQ: [], IONZ:[], QBTS: [], QBTZ:[] })
  const [leng, setLength] = useState(0);
  
  useEffect(() => {
    const key = import.meta.env.VITE_ALPACA_KEY;
    const secret = import.meta.env.VITE_ALPACA_SECRET;

    // Free plan usually uses IEX live stream
    const ws = getSocket(createSocket);
    socketRef.current = ws;

    ws.onopen = () => {
      setStatus("socket opened");
      addLog("Socket opened");
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      addLog(`Received: ${event.data}`);
      console.log("data: ", event.data);
      const stockName = "FAKEPACA"; //TO DELETE LATER

      // Alpaca sends arrays of messages
      for (const msg of data) {
        if (msg.T === "t"){
            console.log("inside t");
            setDictTradeStock((prev) => ({ ...prev, [stockName]: [...(prev[stockName] || []), msg]}));
            
            console.log(data);
        }
        if (msg.T === "q"){
            console.log("inside q");
            setDictQuoteStock((prev) => ({ ...prev, [stockName]: [...(prev[stockName] || []), msg]}));
            
            console.log(data);
        }
        if (msg.T === "b"){
            console.log("inside b");
            setDictStock((prev) => ({ ...prev, [stockName]: [...(prev[stockName] || []), msg]}));
            
            console.log(data);
            setLength(dictStock.FAKEPACA.length);
            console.log(dictStock.FAKEPACA.length);
        }
        // Step 1: wait for Alpaca welcome message
        if (msg.T === "success" && msg.msg === "connected") {
            console.log("msg.T: ", msg.T);
            console.log("msg.msg: ", msg.msg)
          ws.send(
            JSON.stringify({
              action: "auth",
              key,
              secret,
            })
          );
          addLog("Sent auth");
        }

        // Step 2: after auth succeeds, subscribe
        if (msg.T === "success" && msg.msg === "authenticated") {
            console.log("msg.T: ", msg.T);
            console.log("msg.msg: ", msg.msg)
          setStatus("authenticated");

          ws.send(
            JSON.stringify({
              action: "subscribe",
              trades: ["FAKEPACA"],
              quotes: ["FAKEPACA"],
              bars: ["FAKEPACA"],
            })
          );

          addLog("Subscribed to FAKEPACA trades/quotes/bars");
        }

        // Optional: handle errors from Alpaca
        if (msg.T === "error") {
          setStatus("error");
          addLog(`Error: ${msg.msg || "Unknown Alpaca error"}`);
        }
      }
    };

    ws.onerror = () => {
      setStatus("error");
      addLog("WebSocket error");
    };

    ws.onclose = () => {
      setStatus("closed");
      addLog("Socket closed");
    };

    function addLog(text) {
      setLogs((prev) => [...prev, text]);
    }

    

    return () => {
      ws.close();
    };
  }, []);

  function sendCustomPing() {
    const ws = socketRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ action: "subscribe", bars: ["TSLA"] }));
    }
  }

  function closeWs(){
    const ws = socketRef.current;
    if (ws) ws.close();
  }
   console.log("dropdown");

  return (
    <socketContext.Provider value={{dictTradeStock, dictQuoteStock, dictStock, status, closeWs}}>
        {children}
    </socketContext.Provider>
  )
  
//   return (
//     <div style={{ padding: "16px" }}>
//       <h2>Alpaca WebSocket Demo</h2>
//       <p>Status: {status}</p>

//       <button onClick={sendCustomPing}>Also subscribe to TSLA trades</button>
//         <button onClick={closeWs}> Close connection </button>
//       <div style={{ marginTop: "16px" }}>
//         {(dictStock["FAKEPACA"] || []).map((log, i) => (
//           <p key={i}>{log.t || ""}</p>
//         ))}
//         <p>{dictStock.FAKEPACA.length}</p>
//       </div>
//     </div>
//   );
}

export function useAlSocketInfo(){
    return useContext(socketContext);
}
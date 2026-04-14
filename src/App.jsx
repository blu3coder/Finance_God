import React, { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import DropDown from './DropDown'
import CandleChart from './CandleChart'
import CandleMacdChart  from './CandleMacdChart'
import AlpacaSocket from "/src/AlpacaConnection.jsx"
import DateRange from '/src/DateRange.jsx'
import { SideVolumeProfile } from '/src/SideVolumeProfile.jsx'
import TimeframeRange from '/src/TimeframeRange.jsx'


export default function App() {
  const [stockName, setStockName] = useState("FAKEPACA");
  const [selectedDate, setSelectedDate] =useState("1Day");
  const [selectedTimeframe, setTimeframe] = useState("15Min");
  return (
    <div>
      <h1>My App</h1>
      
      <DropDown setSelected={setStockName}/>
      <DateRange setSelectedDate={setSelectedDate}/>
      <TimeframeRange dateSelected={selectedDate} setTimeframe={setTimeframe} />
      <AlpacaSocket>
      <CandleChart stockName={stockName} dateRange={selectedDate} timeframe={selectedTimeframe}/>
      <SideVolumeProfile stockName={stockName}/>
      <CandleMacdChart dateRange={selectedDate} timeframe={selectedTimeframe} />
      </AlpacaSocket>
      

    </div>
  );
}

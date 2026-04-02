import React, { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import DropDown from './DropDown'
import CandleChart from './CandleChart'

export default function App() {
  const [stockName, setStockName] = useState("NVDX");
  return (
    <div>
      <h1>My App</h1>
      <DropDown />
      <CandleChart stockName={stockName}/>

    </div>
  );
}

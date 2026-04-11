import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
} from "lightweight-charts";

function DropDown({setStockName}){
    
    const [selected, setSelected] =  useState("NVDX");

    return (
        <div>
            <h3>Choose an option:</h3>

            <select value={selected} onChange={(e) => setStockName(e.target.value)}>
                <option value="NVDX">NVDX</option>
                <option value="NVDQ">NVDQ</option>
                <option value="IONQ">IONQ</option>
                <option value="IONZ">IONZ</option>
                <option value="QBTS">QBTS</option>
                <option value="QBTZ">QBTZ</option>
            </select>

            <p>{selected}</p>
        </div>
    );
}
export default DropDown;
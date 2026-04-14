import React, { useState } from "/node_modules/react";

export default function DateRange( {setSelectedDate}){
    
    return(
        <div>
        <button onClick={() => setSelectedDate("1Day")}>Day</button>
        <button onClick={() => setSelectedDate("1Week")}>Week</button>
        <button onClick={() => setSelectedDate("1Month")}>Month</button>
        <button onClick={() => setSelectedDate("YTD")}>YTD</button>
        <button onClick={() => setSelectedDate("1Year")}>1 Yr</button>
        //<button onClick={() => setSelectedDate("5Year")}></button>
        </div>
    );

};
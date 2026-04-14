import React, { useState } from "/node_modules/react";

export default function TimeframeRange( {dateSelected, setTimeframe}){
    

    if(dateSelected == "1Day"){
        return(
        <div>
        <button onClick={() => setTimeframe("1Min")}>1 Min</button>
        <button onClick={() => setTimeframe("5Min")}>5 Min</button>
        <button onClick={() => setTimeframe("15Min")}>15 Min</button>
        <button onClick={() => setTimeframe("30Min")}>30 Min</button>
        <button onClick={() => setTimeframe("1Hr")}>1 HR</button>
        <button onClick={() => setTimeframe("4Hr")}>4 Hr</button>
        </div>
    );
    }
    else if(dateSelected == "1Week"){
        setTimeframe("15Min");
        return(
        <div>
        <button onClick={() => setTimeframe("15Min")}>15 Min</button>
        <button onClick={() => setTimeframe("30Min")}>30 Min</button>
        <button onClick={() => setTimeframe("1Hr")}>1 HR</button>
        <button onClick={() => setTimeframe("4Hr")}>4 Hr</button>
        </div>
    );
    }
    else if (dateSelected == "1Month"){
        setTimeframe("30Min");
        return(
        <div>
        <button onClick={() => setTimeframe("30Min")}>30 Min</button>
        <button onClick={() => setTimeframe("1Hr")}>1 HR</button>
        <button onClick={() => setTimeframe("4Hr")}>4 Hr</button>
        </div>
    );
    }
    else if (dateSelected == "YTD"){
        setTimeframe("30Min");
        return(
        <div>
        <button onClick={() => setTimeframe("30Min")}>30 Min</button>
        <button onClick={() => setTimeframe("1Hr")}>1 HR</button>
        <button onClick={() => setTimeframe("4Hr")}>4 Hr</button>
        </div>
    );
    }
    else if (dateSelected == "1Year"){
        setTimeframe("1Hr");
        return(
        <div>
        <button onClick={() => setTimeframe("1Hr")}>1 HR</button>
        <button onClick={() => setTimeframe("4Hr")}>4 Hr</button>
        </div>
    );
    };
    

};
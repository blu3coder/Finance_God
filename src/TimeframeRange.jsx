

export default function TimeframeRange( {dateSelected, setTimeframe}){
    

    if(dateSelected == "1Day"){
        return(
        <div>
        <button onClick={() => setTimeframe("1Min")}>1 Min</button>
        <button onClick={() => setTimeframe("5Min")}>5 Min</button>
        <button onClick={() => setTimeframe("15Min")}>15 Min</button>
        <button onClick={() => setTimeframe("30Min")}>30 Min</button>
        <button onClick={() => setTimeframe("1H")}>1 HR</button>
        <button onClick={() => setTimeframe("4H")}>4 Hr</button>
        </div>
    );
    }
    else if(dateSelected == "1Week"){
        
        return(
        <div>
        <button onClick={() => setTimeframe("15Min")}>15 Min</button>
        <button onClick={() => setTimeframe("30Min")}>30 Min</button>
        <button onClick={() => setTimeframe("1H")}>1 HR</button>
        <button onClick={() => setTimeframe("4H")}>4 Hr</button>
        </div>
    );
    }
    else if (dateSelected == "1Month"){
        
        return(
        <div>
        <button onClick={() => setTimeframe("30Min")}>30 Min</button>
        <button onClick={() => setTimeframe("1H")}>1 HR</button>
        <button onClick={() => setTimeframe("4H")}>4 Hr</button>
        </div>
    );
    }
    else if (dateSelected == "YTD"){
        
        return(
        <div>
        <button onClick={() => setTimeframe("30Min")}>30 Min</button>
        <button onClick={() => setTimeframe("1H")}>1 HR</button>
        <button onClick={() => setTimeframe("4H")}>4 Hr</button>
        </div>
    );
    }
    else if (dateSelected == "1Year"){
        
        return(
        <div>
        <button onClick={() => setTimeframe("1Hour")}>1 HR</button>
        <button onClick={() => setTimeframe("4Hour")}>4 Hr</button>
        </div>
    );
    };
    

};
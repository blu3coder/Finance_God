import CandleChart from "./CandleChart";

export default function intertwinedCharts({stockName, dateRange, timeframe}){

    const arrayStock = [
        ["NVDA","NVDX", "NVDQ"],
        ["IONQ", "IONZ"],
        ["QBTS", "QBTZ", "QBTX"],
    ];

    const index = arrayStock.findIndex((innerArr) => innerArr.includes("NVDX"));
    console.log(index);
    return(
     <div>
      {arrayStock[index].map((item, index) => (
        
        <div key={index}>Chart({item}, {dateRange}, {timeframe}, {stockName} )</div>
      ))}
    </div>
    )
}

function Chart({item, dateRange, timeframe, stockName}){
    if (stockName == item){
        return(
        <div style={{display: flex, order:1}}>
        <CandleChart stockName={item} dateRange={dateRange} timeframe={timeframe}/>
        </div>)
    }else{
         return(<div style={{display: flex}}>
        <CandleChart stockName={item} dateRange={dateRange} timeframe={timeframe}/>
    </div>)
    }

}
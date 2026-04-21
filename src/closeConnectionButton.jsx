import { useAlSocketInfo } from "./AlpacaConnection";


export function CloseConnection(){
    const {closeWs} = useAlSocketInfo();
    if (closeWs){
        return(
                
                <div style={{ marginTop: "12px" }}>
                <button onClick={closeWs}>Close connection</button>
                </div>
            );
    }
    
};
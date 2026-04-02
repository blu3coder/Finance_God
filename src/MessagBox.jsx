import React, {useEffect} from "react";

function useQuote(name) {
    const message = `Stock Selected, ${name}`;

    const [quote, setQuote] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        async function getQuote() {
      try {
        setLoading(true);

        const res = await fetch(
          `https://finnhub.io/api/v1/quote?symbol=${name}&token=d7614p1r01qm4b7si8pgd7614p1r01qm4b7si8q0`
        );

        if (!res.ok) {
          throw new Error("Failed to fetch");
        }

        const data = await res.json();
        setQuote(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    getQuote();
  }, [name]);

  return { quote, loading, error };
}

export default MessageBox;
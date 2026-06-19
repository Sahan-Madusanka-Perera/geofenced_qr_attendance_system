import { useState, useEffect, useRef } from 'react';

/**
 * Custom hook for Server-Sent Events.
 * Auto-reconnects on connection drop.
 */
export function useSSE(url) {
  const [data, setData] = useState(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);
  const eventSourceRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  useEffect(() => {
    if (!url) return;

    function connect() {
      const es = new EventSource(url);
      eventSourceRef.current = es;

      es.onopen = () => {
        setConnected(true);
        setError(null);
      };

      es.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          if (parsed.ended) {
            setConnected(false);
            es.close();
            return;
          }
          setData(parsed);
        } catch (err) {
          console.error('SSE parse error:', err);
        }
      };

      es.onerror = () => {
        setConnected(false);
        es.close();
        // Reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(connect, 3000);
      };
    }

    connect();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [url]);

  return { data, connected, error };
}

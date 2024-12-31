import { createContext, useEffect, useState } from "react";

export const RedisSSEContext = createContext();

export const RedisSSEProvider = ({ channels, children }) => {
  const [data, setData] = useState({});

  useEffect(() => {
    if (!channels || channels.length === 0) {
      console.error("No channels specified for SSE.");
      return;
    }

    // Convert channels to a comma-separated string
    console.log("channels", channels);
    const channelQuery = channels.join(",");

    // Connect to the SSE endpoint with the specified channels
    const eventSource = new EventSource(`/api/events?channels=${channelQuery}`);

    eventSource.onopen = () => {
      console.log("SSE connection opened.");
    };

    eventSource.onmessage = (event) => {
      if (event.data === "Connected") {
        console.log("SSE connection established.");
        return;
      }
      const { channel, message } = JSON.parse(event.data);
      setData((prev) => ({
        ...prev,
        [channel]: JSON.parse(message),
      }));
    };

    eventSource.onerror = (err) => {
      console.error("SSE error:", err);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [channels]);

  return (
    <RedisSSEContext.Provider value={data}>{children}</RedisSSEContext.Provider>
  );
};

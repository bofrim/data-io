import React, { createContext, useEffect, useState } from "react";

export const RedisDataContext = createContext();

export const RedisProvider = ({ channels, children }) => {
  const [channelData, setChannelData] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      const updates = {};
      for (const channel of Object.keys(channels)) {
        try {
          const response = await fetch(`/api/redis?channel=${channel}`);
          const result = await response.json();
          updates[channel] = result.data;
        } catch (err) {
          console.error(`Error fetching data for channel ${channel}:`, err);
        }
      }
      setChannelData((prev) => ({ ...prev, ...updates }));
    };

    fetchData();
    const interval = setInterval(fetchData, 1000); // Poll every second

    return () => clearInterval(interval);
  }, [channels]);

  return (
    <RedisDataContext.Provider value={channelData}>
      {children}
    </RedisDataContext.Provider>
  );
};

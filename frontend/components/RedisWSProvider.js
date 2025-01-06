import { createContext, useEffect, useState } from "react";

export const RedisWebSocketContext = createContext();

export const RedisWebSocketProvider = ({ channels, children }) => {
  const [data, setData] = useState({});
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!channels || channels.length === 0) {
      console.error("No channels specified for WebSocket.");
      return;
    }

    // Create a new WebSocket connection
    const ws = new WebSocket("ws://your-websocket-server-endpoint");

    ws.onopen = () => {
      console.log("WebSocket connection opened.");

      // Send the subscription request to the server
      ws.send(JSON.stringify({ action: "subscribe", channels }));
    };

    ws.onmessage = (event) => {
      const { channel, message } = JSON.parse(event.data);

      // Update the state with new data for the channel
      setData((prev) => ({
        ...prev,
        [channel]: JSON.parse(message),
      }));
    };

    ws.onerror = (err) => {
      console.error("WebSocket error:", err);
    };

    ws.onclose = () => {
      console.log("WebSocket connection closed.");
    };

    // Save the WebSocket instance to state
    setSocket(ws);

    // Cleanup on component unmount or dependency change
    return () => {
      ws.close();
    };
  }, [channels]);

  // Expose sendMessage functionality if needed
  const sendMessage = (message) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    } else {
      console.error("WebSocket is not open. Unable to send message.");
    }
  };

  return (
    <RedisWebSocketContext.Provider value={{ data, sendMessage }}>
      {children}
    </RedisWebSocketContext.Provider>
  );
};

import { createContext, useEffect, useRef, useState } from "react";

export const WsBufferContext = createContext();

export const WsBufferProvider = ({ children }) => {
  // React state holds a dictionary of channels -> array of data points
  const [bufferedData, setBufferedData] = useState({});

  // Keep a ref for the active WebSocket instance
  const wsRef = useRef(null);

  // For each channel, store all data points that arrive between renders
  // Example structure: innerBufferRef.current = { channelA: [point1, point2], channelB: [point3] }
  const innerBufferRef = useRef({});

  useEffect(() => {
    // Connect to your wsproxy /consumer endpoint
    const socket = new WebSocket("ws://127.0.0.1:8080/consumer");
    socket.binaryType = "blob"; // Ensure binary messages come in as Blobs

    wsRef.current = socket;
    socket.onopen = () => {
      console.log("WebSocket connected to wsproxy /consumer");
    };

    socket.onmessage = async (event) => {
      try {
        let rawMessage = event.data;

        // If the message is a Blob, convert it to text
        if (rawMessage instanceof Blob) {
          rawMessage = await rawMessage.text();
        }

        // Parse the JSON: { source, channel, value }
        const { channel, value } = JSON.parse(rawMessage);

        // If we haven't seen this channel in the buffer yet, create an empty array
        if (!innerBufferRef.current[channel]) {
          innerBufferRef.current[channel] = [];
        }

        // Push the new data point onto the buffer array
        innerBufferRef.current[channel].push(value);
      } catch (err) {
        console.error("Invalid WS message or parse error:", event.data, err);
      }
    };

    socket.onerror = (err) => {
      console.error("WebSocket error:", err);
    };

    socket.onclose = () => {
      console.log("WebSocket disconnected");
    };

    // Cleanup on unmount
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  // Throttle or batch updates so we don’t call setState continuously
  useEffect(() => {
    let active = true;

    const updateLoop = () => {
      setBufferedData((prevData) => {
        const newData = {};
        for (const key of Object.keys(prevData)) {
          newData[key] = [];
        }

        for (const channel of Object.keys(innerBufferRef.current)) {
          // Ensure newData[channel] is an array
          if (!newData[channel]) {
            newData[channel] = [];
          }
          // Append any new data points for this channel
          newData[channel].push(...innerBufferRef.current[channel]);
        }

        // Clear the buffer now that we've merged it
        innerBufferRef.current = {};

        return newData;
      });

      if (active) {
        // Schedule the next update on the next animation frame (~60 FPS)
        requestAnimationFrame(updateLoop);
      }
    };

    // Start the loop
    requestAnimationFrame(updateLoop);

    // Stop updating when the component unmounts
    return () => {
      active = false;
    };
  }, []);

  // Optional: provide a way to send messages out over the same socket
  const sendMessage = (message) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    } else {
      console.error("WebSocket is not open. Unable to send message.");
    }
  };

  return (
    <WsBufferContext.Provider value={{ data: bufferedData, sendMessage }}>
      {children}
    </WsBufferContext.Provider>
  );
};

export const channelMerger = (oldValues, newValues, width, mapFn) => {
  const mappedNewValues = mapFn ? newValues.map(mapFn) : newValues;
  const merged = [...oldValues, ...mappedNewValues];
  return merged.slice(-1 * width);
};

export const channelSampler = (oldValue, newValues) => {
  return newValues.length > 0 ? newValues[newValues.length - 1] : oldValue;
};

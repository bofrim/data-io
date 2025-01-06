import Redis from "ioredis";
import { WebSocketServer } from "ws";

let redisClient;
const clients = new Map(); // Map of WebSocket clients and their subscribed channels
const activeSubscriptions = new Set(); // Track active Redis subscriptions

// Initialize Redis client
if (!redisClient) {
  redisClient = new Redis();

  redisClient.on("connect", () => {
    console.log("Redis client connected.");
  });

  redisClient.on("error", (err) => {
    console.error("Redis error:", err);
  });

  // Handle incoming Redis messages
  redisClient.on("message", (channel, message) => {
    // Push the update to all connected WebSocket clients subscribed to this channel
    clients.forEach((channels, ws) => {
      if (channels.has(channel) && ws.readyState === ws.OPEN) {
        try {
          ws.send(JSON.stringify({ channel, message }));
        } catch (err) {
          console.error(`Failed to send message to client:`, err);
        }
      }
    });
  });
}

// WebSocket handler
const wss = new WebSocketServer({ noServer: true });

wss.on("connection", (ws) => {
  const subscribedChannels = new Set();
  clients.set(ws, subscribedChannels);

  console.log("WebSocket client connected.");

  ws.on("message", (message) => {
    try {
      const { action, channels } = JSON.parse(message);

      if (action === "subscribe" && Array.isArray(channels)) {
        // Add channels to the client's subscriptions
        channels.forEach((channel) => {
          subscribedChannels.add(channel);

          // Dynamically subscribe to Redis channels
          if (!activeSubscriptions.has(channel)) {
            redisClient.subscribe(channel, (err) => {
              if (err) {
                console.error(
                  `Failed to subscribe to channel ${channel}:`,
                  err
                );
              } else {
                console.log(`Subscribed to new channel: ${channel}`);
                activeSubscriptions.add(channel);
              }
            });
          }
        });

        console.log(`Client subscribed to channels: ${channels.join(", ")}`);
      }
    } catch (err) {
      console.error("Error processing WebSocket message:", err);
    }
  });

  ws.on("close", () => {
    console.log("WebSocket client disconnected.");
    clients.delete(ws);

    // Clean up unused Redis subscriptions
    const remainingChannels = new Set(
      Array.from(clients.values()).flatMap((channels) => Array.from(channels))
    );

    activeSubscriptions.forEach((channel) => {
      if (!remainingChannels.has(channel)) {
        redisClient.unsubscribe(channel, (err) => {
          if (err) {
            console.error(
              `Failed to unsubscribe from channel ${channel}:`,
              err
            );
          } else {
            console.log(`Unsubscribed from channel: ${channel}`);
            activeSubscriptions.delete(channel);
          }
        });
      }
    });
  });
});

// Export handler to integrate with the server
export default function handler(req, res) {
  if (req.method === "GET" && req.headers.upgrade === "websocket") {
    // Handle WebSocket upgrade
    wss.handleUpgrade(req, req.socket, Buffer.alloc(0), (ws) => {
      wss.emit("connection", ws, req);
    });
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}

// Disable Next.js body parser for this API route
export const config = {
  api: {
    bodyParser: false,
  },
};

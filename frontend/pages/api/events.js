import Redis from "ioredis";

let redisClient;
const clients = []; // Store connected SSE clients
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
    // Push the update to all connected SSE clients subscribed to this channel
    clients.forEach((client) => {
      if (client.channels.has(channel)) {
        try {
          client.res.write(`data: ${JSON.stringify({ channel, message })}\n\n`);
          client.res.flush?.();
        } catch (err) {
          console.error(`Failed to write to client ${client.id}:`, err);
        }
      }
    });
  });
}

export default function handler(req, res) {
  if (req.method === "GET") {
    const { channels } = req.query;

    if (!channels) {
      res.status(400).json({ error: "Channels query parameter is required." });
      return;
    }

    // Parse the requested channels from the query parameter
    const requestedChannels = new Set(channels.split(","));

    // Set headers for SSE
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    // Send an initial message to establish the connection
    res.write("data: Connected\n\n");
    res.flush?.();

    // Add the client to the list
    const clientId = Date.now();
    const newClient = { id: clientId, res, channels: requestedChannels };
    clients.push(newClient);

    console.log(
      `Client connected: ${clientId} with channels: ${Array.from(
        requestedChannels
      ).join(", ")}`
    );

    // Dynamically subscribe to requested channels
    requestedChannels.forEach((channel) => {
      if (!activeSubscriptions.has(channel)) {
        redisClient.subscribe(channel, (err) => {
          if (err) {
            console.error(`Failed to subscribe to channel ${channel}:`, err);
          } else {
            console.log(`Subscribed to new channel: ${channel}`);
            activeSubscriptions.add(channel);
          }
        });
      }
    });

    // Handle client disconnect
    const cleanupClient = () => {
      console.log(`Client disconnected: ${clientId}`);
      clients.splice(clients.indexOf(newClient), 1);

      // Clean up unused Redis subscriptions
      const remainingChannels = new Set(
        clients.flatMap((client) => Array.from(client.channels))
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
    };

    req.on("close", cleanupClient);
    res.on("close", cleanupClient);
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

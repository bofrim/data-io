import Redis from "ioredis";

let redisClient;

export default async function handler(req, res) {
  // Initialize the Redis client if it doesn't exist
  if (!redisClient) {
    redisClient = new Redis();
  }

  // Extract the channel name from the request query
  const { channel } = req.query;

  if (!channel) {
    console.warn("No channel provided in the request.");
    res.status(400).json({ error: "Channel is required" });
    return;
  }

  try {
    // Fetch the data from Redis
    const data = await redisClient.get(channel);

    // Parse and send the data as a JSON response
    res.status(200).json({ channel, data: JSON.parse(data) });
  } catch (error) {
    // Log the error if something goes wrong
    console.error(`Error fetching data for channel ${channel}:`, error.message);
    res.status(500).json({ error: error.message });
  }
}

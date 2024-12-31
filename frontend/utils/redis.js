// utils/redis.js
import { createClient } from "redis";

const redisClient = createClient();

export const subscribeToChannel = (channel, callback) => {
  redisClient.connect().then(() => {
    redisClient.subscribe(channel, (message) => {
      callback(JSON.parse(message)); // Parse JSON-encoded data
    });
  });
};

export const unsubscribeFromChannel = (channel) => {
  redisClient.unsubscribe(channel);
};

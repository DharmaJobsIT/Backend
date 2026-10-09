import { createClient } from "redis";

let redisClient;

export const connectRedis = async () => {
  try {
    redisClient = createClient({
      url: process.env.REDIS_URL,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 5) {
            console.warn("Redis reconnect attempts exhausted.");
            return new Error("Redis unavailable");
          }
          return Math.min(retries * 300, 3000);
        },
      },
    });

    redisClient.on("error", () => {
      // Silence repeated internal errors
    });

    await redisClient.connect();
    console.log("Redis Connected");

    return redisClient;
  } catch (error) {
    console.warn("Redis not connected. Running without cache.");
    return null;
  }
};

export { redisClient };

// netlify/functions/_lib/redis.js
// Shared Upstash Redis client.
// Used for conversation buffer (last N messages per user).

import { Redis } from '@upstash/redis';

export const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
});
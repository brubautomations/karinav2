// netlify/functions/ping-upstash.js
// Health check: can we write and read from Upstash Redis?

import { redis } from './_lib/redis.js';

export default async (req, context) => {
    if (req.method !== 'GET') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    try {
        const testKey = 'karina:ping';
        const testValue = `Redis is alive @ ${new Date().toISOString()}`;

        // Write a value (with 60-second TTL so Redis stays clean)
        await redis.set(testKey, testValue, { ex: 60 });

        // Read it back
        const readBack = await redis.get(testKey);

        return new Response(
            JSON.stringify({
                status: 'ok',
                redis_wrote: testValue,
                redis_read: readBack,
                match: readBack === testValue,
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
    } catch (err) {
        return new Response(
            JSON.stringify({ error: 'Upstash error', message: err.message }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
};
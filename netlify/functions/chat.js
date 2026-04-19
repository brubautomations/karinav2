// netlify/functions/chat.js
// The main chat endpoint.
// Accepts { message, userId }, returns Karina's reply.
// Maintains per-user conversation buffer in Redis.
// Logs full history to Supabase.

import { redis } from './_lib/redis.js';
import { supabase } from './_lib/supabase.js';
import { KARINA_SFW_PROMPT } from './_lib/personas.js';

const MISTRAL_URL = 'https://api.mistral.ai/v1/chat/completions';
const MODEL_SFW = 'mistral-small-latest';
const BUFFER_SIZE = 10; // last N turns kept in Redis

export default async (req, context) => {
    // ---- Method guard ----
    if (req.method !== 'POST') {
        return json({ error: 'Method not allowed' }, 405);
    }

    // ---- Parse input ----
    let body;
    try {
        body = await req.json();
    } catch {
        return json({ error: 'Invalid JSON' }, 400);
    }

    const { message, userId } = body;
    if (!message || typeof message !== 'string') {
        return json({ error: 'Missing or invalid message' }, 400);
    }
    if (!userId || typeof userId !== 'string') {
        return json({ error: 'Missing or invalid userId' }, 400);
    }

    // ---- Env check ----
    const apiKey = process.env.MISTRAL_API_KEY;
    if (!apiKey) {
        return json({ error: 'MISTRAL_API_KEY not configured' }, 500);
    }

    const bufferKey = `chat:${userId}:buffer`;

    try {
        // ---- 1. Load conversation buffer from Redis ----
        const raw = await redis.lrange(bufferKey, 0, -1);
        const history = (raw || []).map((item) =>
            typeof item === 'string' ? JSON.parse(item) : item
        );

        // ---- 2. Build Mistral message array ----
        const messages = [
            { role: 'system', content: KARINA_SFW_PROMPT },
            ...history,
            { role: 'user', content: message },
        ];

        // ---- 3. Call Mistral ----
        const mistralRes = await fetch(MISTRAL_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: MODEL_SFW,
                messages,
                max_tokens: 300,
                temperature: 0.8,
            }),
        });

        if (!mistralRes.ok) {
            const errText = await mistralRes.text();
            return json(
                { error: 'Mistral error', status: mistralRes.status, details: errText },
                502
            );
        }

        const mistralData = await mistralRes.json();
        const reply = mistralData.choices?.[0]?.message?.content?.trim();
        if (!reply) {
            return json({ error: 'Empty reply from Mistral' }, 502);
        }

        // ---- 4. Update Redis buffer (append user + assistant, trim to BUFFER_SIZE * 2) ----
        const userTurn = JSON.stringify({ role: 'user', content: message });
        const assistantTurn = JSON.stringify({ role: 'assistant', content: reply });
        await redis.rpush(bufferKey, userTurn, assistantTurn);
        await redis.ltrim(bufferKey, -BUFFER_SIZE * 2, -1);
        await redis.expire(bufferKey, 60 * 60 * 24 * 7); // 7-day TTL

        // ---- 5. Log to Supabase (fire-and-forget, don't block reply) ----
        logMessages(userId, message, reply, mistralData.model).catch((e) =>
            console.error('Supabase log failed:', e.message)
        );

        // ---- 6. Respond ----
        return json({
            reply,
            model: mistralData.model,
            usage: mistralData.usage,
        });
    } catch (err) {
        return json({ error: 'Unexpected error', message: err.message }, 500);
    }
};

// ---- Helpers ----

function json(obj, status = 200) {
    return new Response(JSON.stringify(obj), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}

async function logMessages(userId, userMsg, karinaReply, model) {
    // For now we log with the raw userId as clerk_id placeholder.
    // In Phase 2, userId will be a real Clerk ID and we'll link to users.id.
    // To keep this functional now, we skip the users table FK and log raw text.
    // TODO Phase 2: resolve userId -> users.id via Clerk sync before inserting.
    // For Batch 7 we just log into a lightweight debug table.
    await supabase.from('chat_debug_log').insert([
        { user_key: userId, role: 'user', content: userMsg, model },
        { user_key: userId, role: 'karina', content: karinaReply, model },
    ]);
}
// netlify/functions/chat.js
// Main chat endpoint. Requires Clerk JWT.
// Extracts clerkUserId from token, resolves to Supabase users.id.

import { redis } from './_lib/redis.js';
import { supabase } from './_lib/supabase.js';
import { requireAuth, AuthError } from './_lib/auth.js';
import { KARINA_SFW_PROMPT } from './_lib/personas.js';

const MISTRAL_URL = 'https://api.mistral.ai/v1/chat/completions';
const MODEL_SFW = 'mistral-small-latest';
const BUFFER_SIZE = 10;

export default async (req, context) => {
    if (req.method !== 'POST') {
        return json({ error: 'Method not allowed' }, 405);
    }

    // ---- Auth ----
    let clerkUserId;
    try {
        const { clerkUserId: id } = await requireAuth(req);
        clerkUserId = id;
    } catch (err) {
        const status = err instanceof AuthError ? err.status : 500;
        return json({ error: err.message }, status);
    }

    // ---- Parse input ----
    let body;
    try {
        body = await req.json();
    } catch {
        return json({ error: 'Invalid JSON' }, 400);
    }

    const { message } = body;
    if (!message || typeof message !== 'string') {
        return json({ error: 'Missing or invalid message' }, 400);
    }

    // ---- Resolve clerk_id -> supabase user row ----
    const { data: userRow, error: userErr } = await supabase
        .from('users')
        .select('id')
        .eq('clerk_id', clerkUserId)
        .single();

    if (userErr || !userRow) {
        return json({ error: 'User not found in DB', details: userErr?.message }, 404);
    }

    const userId = userRow.id; // Supabase UUID

    // ---- Env check ----
    const apiKey = process.env.MISTRAL_API_KEY;
    if (!apiKey) {
        return json({ error: 'MISTRAL_API_KEY not configured' }, 500);
    }

    const bufferKey = `chat:${userId}:buffer`;

    try {
        // ---- Load conversation buffer ----
        const raw = await redis.lrange(bufferKey, 0, -1);
        const history = (raw || []).map((item) =>
            typeof item === 'string' ? JSON.parse(item) : item
        );

        // ---- Build Mistral message array ----
        const messages = [
            { role: 'system', content: KARINA_SFW_PROMPT },
            ...history,
            { role: 'user', content: message },
        ];

        // ---- Call Mistral ----
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

        // ---- Update Redis buffer ----
        const userTurn = JSON.stringify({ role: 'user', content: message });
        const assistantTurn = JSON.stringify({ role: 'assistant', content: reply });
        await redis.rpush(bufferKey, userTurn, assistantTurn);
        await redis.ltrim(bufferKey, -BUFFER_SIZE * 2, -1);
        await redis.expire(bufferKey, 60 * 60 * 24 * 7);

        // ---- Log to Supabase (fire-and-forget) ----
        supabase
            .from('messages')
            .insert([
                { user_id: userId, role: 'user', content: message, model_used: MODEL_SFW },
                { user_id: userId, role: 'karina', content: reply, model_used: mistralData.model },
            ])
            .then(({ error }) => {
                if (error) console.error('Message log failed:', error.message);
            });

        // ---- Respond ----
        return json({
            reply,
            model: mistralData.model,
            usage: mistralData.usage,
        });
    } catch (err) {
        return json({ error: 'Unexpected error', message: err.message }, 500);
    }
};

function json(obj, status = 200) {
    return new Response(JSON.stringify(obj), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}
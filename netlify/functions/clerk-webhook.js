// netlify/functions/clerk-webhook.js
// Receives signup/update/delete events from Clerk,
// syncs user data to Supabase.

import { Webhook } from 'svix';
import { supabase } from './_lib/supabase.js';

const CLERK_WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

export default async (req, context) => {
    if (req.method !== 'POST') {
        return json({ error: 'Method not allowed' }, 405);
    }

    if (!CLERK_WEBHOOK_SECRET) {
        return json({ error: 'CLERK_WEBHOOK_SECRET not configured' }, 500);
    }

    // ---- Verify Svix signature ----
    const svixId = req.headers.get('svix-id');
    const svixTimestamp = req.headers.get('svix-timestamp');
    const svixSignature = req.headers.get('svix-signature');

    if (!svixId || !svixTimestamp || !svixSignature) {
        return json({ error: 'Missing Svix headers' }, 400);
    }

    const body = await req.text(); // raw body for signature verification
    const wh = new Webhook(CLERK_WEBHOOK_SECRET);

    let evt;
    try {
        evt = wh.verify(body, {
            'svix-id': svixId,
            'svix-timestamp': svixTimestamp,
            'svix-signature': svixSignature,
        });
    } catch (err) {
        console.error('Webhook verification failed:', err.message);
        return json({ error: 'Invalid signature' }, 401);
    }

    // ---- Handle event ----
    const eventType = evt.type;
    const data = evt.data;

    try {
        switch (eventType) {
            case 'user.created':
                await handleUserCreated(data);
                break;
            case 'user.updated':
                await handleUserUpdated(data);
                break;
            case 'user.deleted':
                await handleUserDeleted(data);
                break;
            default:
                console.log('Unhandled event type:', eventType);
        }

        return json({ received: true, type: eventType });
    } catch (err) {
        console.error('Handler failed:', err.message);
        return json({ error: 'Handler failed', message: err.message }, 500);
    }
};

// ---- Event handlers ----

async function handleUserCreated(data) {
    const email = data.email_addresses?.[0]?.email_address ?? null;
    const username =
        data.username ||
        data.first_name ||
        (email ? email.split('@')[0] : 'user');

    // Insert into users table
    const { data: userRow, error: userErr } = await supabase
        .from('users')
        .insert({
            clerk_id: data.id,
            username,
            email,
        })
        .select()
        .single();

    if (userErr) throw userErr;

    // Initialize karina_state for this user
    const { error: stateErr } = await supabase
        .from('karina_state')
        .insert({ user_id: userRow.id });

    if (stateErr) throw stateErr;

    console.log('User created:', data.id, email);
}

async function handleUserUpdated(data) {
    const email = data.email_addresses?.[0]?.email_address ?? null;
    const username = data.username || data.first_name || null;

    const { error } = await supabase
        .from('users')
        .update({
            username,
            email,
            updated_at: new Date().toISOString(),
        })
        .eq('clerk_id', data.id);

    if (error) throw error;
    console.log('User updated:', data.id);
}

async function handleUserDeleted(data) {
    // ON DELETE CASCADE in schema handles karina_state + messages cleanup
    const { error } = await supabase
        .from('users')
        .delete()
        .eq('clerk_id', data.id);

    if (error) throw error;
    console.log('User deleted:', data.id);
}

// ---- Helper ----

function json(obj, status = 200) {
    return new Response(JSON.stringify(obj), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}
// netlify/functions/_lib/supabase.js
// Shared Supabase client for all backend functions.
// Uses the SERVICE_ROLE_KEY which bypasses Row-Level Security.
// Never expose this client to the frontend.

import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
    console.error('Missing Supabase env vars');
}

export const supabase = createClient(url, serviceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});
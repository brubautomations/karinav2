// netlify/functions/ping-supabase.js
// Health check: can we read from Supabase?

import { supabase } from './_lib/supabase.js';

export default async (req, context) => {
    if (req.method !== 'GET') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    try {
        // Read the ping row we inserted in the schema setup
        const { data, error } = await supabase
            .from('ping')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1);

        if (error) {
            return new Response(
                JSON.stringify({ error: 'Supabase query failed', details: error.message }),
                { status: 502, headers: { 'Content-Type': 'application/json' } }
            );
        }

        return new Response(
            JSON.stringify({
                status: 'ok',
                supabase_said: data?.[0]?.message ?? '(no data)',
                row: data?.[0] ?? null,
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
    } catch (err) {
        return new Response(
            JSON.stringify({ error: 'Unexpected error', message: err.message }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
};
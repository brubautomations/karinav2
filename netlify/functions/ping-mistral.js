// netlify/functions/ping-mistral.js
// Quick health check: can we reach Mistral with our API key?

export default async (req, context) => {
    // Only allow GET requests for this health check
    if (req.method !== 'GET') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    const apiKey = process.env.MISTRAL_API_KEY;

    if (!apiKey) {
        return new Response(
            JSON.stringify({ error: 'MISTRAL_API_KEY not configured' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }

    try {
        const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: 'mistral-small-latest',
                messages: [
                    { role: 'user', content: 'Say hi in exactly 3 words.' },
                ],
                max_tokens: 20,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            return new Response(
                JSON.stringify({
                    error: 'Mistral API error',
                    status: response.status,
                    details: errorText,
                }),
                { status: 502, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const data = await response.json();
        const reply = data.choices?.[0]?.message?.content ?? '(no reply)';

        return new Response(
            JSON.stringify({
                status: 'ok',
                mistral_said: reply,
                model: data.model,
                usage: data.usage,
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
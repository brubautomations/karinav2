// netlify/functions/_lib/auth.js
// Verifies Clerk JWT from Authorization header.
// Returns { userId, clerkUser } on success, throws on failure.

import { verifyToken } from '@clerk/backend';

const CLERK_SECRET = process.env.CLERK_SECRET_KEY;

export async function requireAuth(req) {
    if (!CLERK_SECRET) {
        throw new AuthError('CLERK_SECRET_KEY not configured', 500);
    }

    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();

    if (!token) {
        throw new AuthError('Missing Authorization header', 401);
    }

    try {
        const payload = await verifyToken(token, {
            secretKey: CLERK_SECRET,
        });
        return { clerkUserId: payload.sub, payload };
    } catch (err) {
        throw new AuthError('Invalid or expired token', 401);
    }
}

export class AuthError extends Error {
    constructor(message, status = 401) {
        super(message);
        this.status = status;
    }
}
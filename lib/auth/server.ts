import 'server-only';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { authCookieOptions } from './cookieOptions';

/**
 * Klien Supabase untuk autentikasi di server (membaca sesi dari cookie).
 * writeCookies = true hanya untuk Server Action / Route Handler (login, logout).
 */
export async function createAuthClient(writeCookies = false) {
    const cookieStore = await cookies();

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookieOptions: authCookieOptions,
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll(items) {
                    // Server Component tidak boleh menulis cookie; pembaruan sesi dilakukan oleh proxy.ts
                    if (!writeCookies) return;
                    for (const { name, value, options } of items) {
                        cookieStore.set(name, value, options);
                    }
                },
            },
        },
    );
}
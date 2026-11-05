import { NextResponse, type NextRequest } from 'next/server';
import { createAuthClient } from '@/lib/auth/server';

/**
 * Tujuan link konfirmasi email dari Supabase (?code=...).
 * Menukar code menjadi sesi (cookie), lalu masuk ke beranda.
 * Jika gagal (mis. link dibuka di browser lain), email tetap sudah terkonfirmasi -> arahkan ke /login.
 */
export async function GET(request: NextRequest) {
    const { origin, searchParams } = request.nextUrl;
    const code = searchParams.get('code');

    if (code) {
        const supabase = await createAuthClient(true);
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
            return NextResponse.redirect(`${origin}/`);
        }
    }

    return NextResponse.redirect(`${origin}/login`);
}

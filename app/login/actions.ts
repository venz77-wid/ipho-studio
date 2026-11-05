'use server';

import { createAuthClient } from '@/lib/auth/server';

type LoginResult =
    | { ok: true; destination: '/' | '/admin' }
    | { ok: false; error: string };

export async function login(email: string, password: string): Promise<LoginResult> {
    if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
        return { ok: false, error: 'Email dan kata sandi wajib diisi.' };
    }

    const supabase = await createAuthClient(true);

    const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
    });

    if (error || !data.user) {
        return { ok: false, error: 'Login gagal. Periksa email, kata sandi, dan konfirmasi email.' };
    }

    const { data: profile, error: profileError } = await supabase
        .from('ipho_profiles')
        .select('role')
        .eq('id', data.user.id)
        .single();

    if (profileError || !profile || !['customer', 'admin'].includes(profile.role)) {
        await supabase.auth.signOut({ scope: 'local' });
        return { ok: false, error: 'Profil akun belum tersedia. Hubungi pengelola studio.' };
    }

    // Tujuan ditentukan server dari role di database, bukan dari browser
    return { ok: true, destination: profile.role === 'admin' ? '/admin' : '/' };
}

export async function logout(): Promise<{ error: string | null }> {
    const supabase = await createAuthClient(true);
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    return { error: error ? 'Logout gagal. Silakan coba lagi.' : null };
}

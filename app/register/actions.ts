'use server';

import { createAuthClient } from '@/lib/auth/server';

type RegisterResult =
    | { ok: true; needsEmailConfirmation: boolean }
    | { ok: false; error: string };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function register(
    fullName: string,
    email: string,
    password: string,
    confirmPassword: string,
): Promise<RegisterResult> {
    if ([fullName, email, password, confirmPassword].some((v) => typeof v !== 'string')) {
        return { ok: false, error: 'Data pendaftaran tidak valid.' };
    }

    const name = fullName.trim();
    const mail = email.trim().toLowerCase();

    if (!name || !mail || !password) {
        return { ok: false, error: 'Nama, email, dan kata sandi wajib diisi.' };
    }
    if (name.length > 100) {
        return { ok: false, error: 'Nama terlalu panjang (maksimal 100 karakter).' };
    }
    if (!EMAIL_PATTERN.test(mail)) {
        return { ok: false, error: 'Format email tidak valid.' };
    }
    if (password.length < 8) {
        return { ok: false, error: 'Kata sandi minimal 8 karakter.' };
    }
    if (password !== confirmPassword) {
        return { ok: false, error: 'Konfirmasi kata sandi tidak sama.' };
    }

    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
    const supabase = await createAuthClient(true);

    // Role TIDAK dikirim dari sini. Profil "customer" dibuat oleh trigger database (lihat supabase/ipho_register.sql)
    const { data, error } = await supabase.auth.signUp({
        email: mail,
        password,
        options: {
            emailRedirectTo: `${siteUrl}/auth/callback`,
            data: { full_name: name },
        },
    });

    if (error) {
        if (error.code === 'user_already_exists') {
            return { ok: false, error: 'Email ini sudah terdaftar. Silakan masuk.' };
        }
        if (error.code === 'weak_password') {
            return { ok: false, error: 'Kata sandi terlalu lemah. Gunakan kombinasi yang lebih kuat.' };
        }
        if (error.code === 'over_email_send_rate_limit' || error.status === 429) {
            return { ok: false, error: 'Terlalu banyak percobaan. Coba lagi beberapa menit lagi.' };
        }
        return { ok: false, error: 'Pendaftaran gagal. Silakan coba lagi.' };
    }

    // Jika konfirmasi email aktif, Supabase mengembalikan user palsu (identities kosong) untuk email yang sudah ada
    if (data.user && data.user.identities?.length === 0) {
        return { ok: false, error: 'Email ini sudah terdaftar. Silakan masuk.' };
    }

    // session ada = konfirmasi email dimatikan (langsung login); session null = tunggu klik link di email
    return { ok: true, needsEmailConfirmation: !data.session };
}

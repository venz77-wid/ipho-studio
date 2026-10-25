// Klien Supabase KHUSUS SERVER (API route). Memakai secret key yang melewati RLS.
// JANGAN pernah di-import dari komponen 'use client'.
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY belum diisi di .env.local');
}

export const supabaseAdmin = createClient(url, key, { auth: { persistSession: false } });
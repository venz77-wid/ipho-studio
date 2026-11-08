import 'server-only';
import { createAuthClient } from './server';

type AdminCheck =
    | { ok: true; userId: string }
    | { ok: false; status: 401 | 403; error: string };

/** Pemeriksaan admin di dalam API route (lapisan kedua setelah proxy.ts). */
export async function requireAdmin(): Promise<AdminCheck> {
    const supabase = await createAuthClient();

    const {
        data: { user },
        error,
    } = await supabase.auth.getUser();
    if (error || !user) return { ok: false, status: 401, error: 'Silakan login terlebih dahulu.' };

    const { data: profile } = await supabase
        .from('ipho_profiles')
        .select('role')
        .eq('id', user.id)
        .single();
    if (profile?.role !== 'admin') return { ok: false, status: 403, error: 'Akses khusus admin.' };

    return { ok: true, userId: user.id };
}

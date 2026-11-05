import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { createAuthClient } from '@/lib/auth/server';

// Pemeriksaan kedua (selain proxy.ts) sebelum area admin dirender
export default async function AdminLayout({ children }: { children: ReactNode }) {
    const supabase = await createAuthClient();

    const {
        data: { user },
        error,
    } = await supabase.auth.getUser();

    if (error || !user) {
        redirect('/login');
    }

    const { data: profile } = await supabase
        .from('ipho_profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (profile?.role !== 'admin') {
        redirect('/');
    }

    return <>{children}</>;
}

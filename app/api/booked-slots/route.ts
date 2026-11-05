import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { STALE_MS } from '@/lib/midtrans';

export async function GET(req: Request): Promise<NextResponse> {
    const date = new URL(req.url).searchParams.get('date') ?? '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return NextResponse.json({ error: 'Tanggal tidak valid.' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
        .from('bookings')
        .select('start_time, end_time, status, created_at')
        .eq('booking_date', date)
        .in('status', ['pending', 'confirmed']);
    if (error) return NextResponse.json({ error: 'Gagal memuat jadwal.' }, { status: 500 });

    // Pesanan "menunggu bayar" yang sudah lewat batas waktu tidak lagi mengunci jam
    const cutoff = Date.now() - STALE_MS;
    const ranges = (data ?? [])
        .filter((r) => r.status === 'confirmed' || new Date(r.created_at).getTime() >= cutoff)
        .map((r) => ({ start: String(r.start_time).slice(0, 5), end: String(r.end_time).slice(0, 5) }));

    return NextResponse.json({ ranges }, { headers: { 'Cache-Control': 'no-store' } });
}
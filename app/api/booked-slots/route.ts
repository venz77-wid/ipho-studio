import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { isBookingDate, loadRoomAvailability } from '@/lib/roomAvailability';
import { SLOT_START_TIMES, calculateEndTime, isSlotInPast } from '@/lib/scheduleUtils';
import { syncStaleBookingsForDate } from '@/lib/midtrans';

export async function GET(req: Request): Promise<NextResponse> {
    const params = new URL(req.url).searchParams;
    const date = params.get('date') ?? '';
    const packageSlug = params.get('packageSlug') ?? '';
    if (!isBookingDate(date) || !packageSlug) {
        return NextResponse.json({ error: 'Tanggal atau paket tidak valid.' }, { status: 400 });
    }

    try {
        const { data: pkg, error } = await supabaseAdmin
            .from('packages').select('duration_minutes').eq('slug', packageSlug)
            .eq('is_active', true).maybeSingle();
        if (error) throw error;
        if (!pkg) return NextResponse.json({ error: 'Paket tidak ditemukan.' }, { status: 404 });

        await syncStaleBookingsForDate(date);
        const availableRooms = await loadRoomAvailability(date);
        const availableStartTimes = SLOT_START_TIMES
            .filter(({ startTime }) => !isSlotInPast(date, startTime) &&
                availableRooms(startTime, calculateEndTime(startTime, pkg.duration_minutes)).length > 0)
            .map(({ startTime }) => startTime);
        return NextResponse.json({ availableStartTimes }, { headers: { 'Cache-Control': 'no-store' } });
    } catch (error) {
        console.error('Gagal memuat jadwal:', error);
        return NextResponse.json({ error: 'Gagal memuat jadwal.' }, { status: 500 });
    }
}

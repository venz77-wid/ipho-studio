import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { isScheduleDate } from '@/lib/adminSchedule';
import { isCashierMethod, normalizeWhatsApp } from '@/lib/adminBookingOperations';
import { loadRoomAvailability } from '@/lib/roomAvailability';
import { ORDER_ID_RE } from '@/lib/myBookingTypes';
import { studioSlots, calculateEndTime, getStudioNow, toMinutes } from '@/lib/scheduleUtils';

const uuid = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const clock = /^([01]\d|2[0-3]):[0-5]\d$/;
const fail = (status: number, error: string) => NextResponse.json({ error }, { status });

export async function GET(req: Request) {
    const auth = await requireAdmin();
    if (!auth.ok) return fail(auth.status, auth.error);
    const query = new URL(req.url).searchParams;
    const date = query.get('date');
    const roomId = query.get('roomId') ?? '';
    const orderId = query.get('orderId');
    const packageId = query.get('packageId') ?? '';
    const now = getStudioNow();
    if (!isScheduleDate(date) || date < now.date || !uuid.test(roomId) ||
        (orderId ? !ORDER_ID_RE.test(orderId) : !uuid.test(packageId))) {
        return fail(400, 'Tanggal, ruangan, atau pesanan tidak valid.');
    }

    try {
        let duration: number;
        let excludeId: string | undefined;
        if (orderId) {
            const { data, error } = await supabaseAdmin.from('bookings')
                .select('id,start_time,end_time').eq('order_id', orderId).eq('status', 'confirmed').maybeSingle();
            if (error) throw error;
            if (!data) return fail(404, 'Pesanan terkonfirmasi tidak ditemukan.');
            duration = toMinutes(data.end_time) - toMinutes(data.start_time);
            excludeId = data.id;
        } else {
            const { data, error } = await supabaseAdmin.from('packages')
                .select('duration_minutes').eq('id', packageId).eq('is_active', true).maybeSingle();
            if (error) throw error;
            if (!data) return fail(404, 'Paket aktif tidak ditemukan.');
            duration = data.duration_minutes;
        }
        if (duration <= 0) return fail(400, 'Durasi sesi tidak valid.');
        const available = await loadRoomAvailability(date, excludeId);
        const times = studioSlots(date).map((slot) => slot.startTime);
        if (!orderId && date === now.date) {
            times.push(String(Math.floor(now.minutes / 60)).padStart(2, '0') + ':' + String(now.minutes % 60).padStart(2, '0'));
        }
        const slots = [...new Set(times)].sort().flatMap((start) => {
            if (date === now.date && toMinutes(start) < now.minutes + (orderId ? 1 : 0)) return [];
            const end = calculateEndTime(start, duration);
            if (!clock.test(end) || !available(start, end).some((room) => room.id === roomId)) return [];
            return [{ start, end }];
        });
        return NextResponse.json({ slots }, { headers: { 'Cache-Control': 'no-store' } });
    } catch (error) {
        console.error('Gagal membaca slot admin:', error);
        return fail(500, 'Gagal memuat ketersediaan ruangan.');
    }
}

export async function POST(req: Request) {
    const auth = await requireAdmin();
    if (!auth.ok) return fail(auth.status, auth.error);
    if (req.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
        return fail(415, 'Permintaan harus berformat JSON.');
    }

    const input = await req.json().catch(() => null);
    if (!input || typeof input.requestId !== 'string' || !uuid.test(input.requestId)) {
        return fail(400, 'ID permintaan tidak valid.');
    }
    const action: unknown = input.action;
    if (action !== 'walk_in' && action !== 'reschedule' && action !== 'complete' && action !== 'cashier') {
        return fail(400, 'Aksi admin tidak dikenal.');
    }

    if (action !== 'walk_in' && (typeof input.orderId !== 'string' || !ORDER_ID_RE.test(input.orderId))) {
        return fail(400, 'Nomor pesanan tidak valid.');
    }
    if ((action === 'walk_in' || action === 'reschedule') &&
        (!isScheduleDate(input.date) || typeof input.roomId !== 'string' || !uuid.test(input.roomId) ||
            typeof input.startTime !== 'string' || !clock.test(input.startTime))) {
        return fail(400, 'Periksa tanggal, ruangan, dan jam sesi.');
    }

    if (action === 'walk_in') {
        if (typeof input.fullName !== 'string' || !input.fullName.trim() || input.fullName.trim().length > 120 ||
            typeof input.whatsapp !== 'string' || !/^\+?[0-9 ()-]{8,25}$/.test(input.whatsapp.trim()) ||
            !/^62\d{8,13}$/.test(normalizeWhatsApp(input.whatsapp)) ||
            typeof input.email !== 'string' || input.email.length > 254 ||
            (input.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) ||
            typeof input.notes !== 'string' || input.notes.length > 500 ||
            typeof input.packageId !== 'string' || !uuid.test(input.packageId) || !isCashierMethod(input.method) ||
            input.paymentConfirmed !== true || !Number.isSafeInteger(input.expectedPrice) || input.expectedPrice <= 0) {
            return fail(400, 'Periksa data klien, paket, dan konfirmasi pembayaran kasir.');
        }
        input.whatsapp = normalizeWhatsApp(input.whatsapp);
    }
    if (action === 'reschedule' &&
        (typeof input.reason !== 'string' || !input.reason.trim() || input.reason.trim().length > 300 ||
            !isScheduleDate(input.expectedDate) || typeof input.expectedStart !== 'string' || !clock.test(input.expectedStart) ||
            (input.expectedRoom !== null && (typeof input.expectedRoom !== 'string' || !uuid.test(input.expectedRoom))))) {
        return fail(400, 'Isi alasan dan muat ulang jadwal pesanan.');
    }
    if (action === 'cashier' &&
        (!isCashierMethod(input.method) || !Number.isSafeInteger(input.amount) || input.amount <= 0 || input.paymentConfirmed !== true)) {
        return fail(400, 'Periksa nominal, metode, dan konfirmasi penerimaan pembayaran.');
    }

    const { data, error } = await supabaseAdmin.rpc('admin_booking_action', {
        p_action: action, p_input: input, p_actor: auth.userId,
    });
    if (error) {
        if (error.code === '42501') return fail(403, 'Akses khusus admin.');
        if (error.code === 'P0002') return fail(404, error.message);
        if (error.code === '22023' || error.code === '23514') return fail(400, error.message);
        if (error.code === '23P01') return fail(409, 'Jam ini sudah dipesan atau diblokir. Pilih slot lain.');
        if (error.code === '40001') return fail(409, error.message);
        if (error.code === '23505' || error.code === '40P01') return fail(409, 'Permintaan berbenturan. Muat ulang data dan coba lagi.');
        if (error.code === 'PGRST202') return fail(503, 'Jalankan connect-admin-operations.sql terlebih dahulu.');
        console.error('Gagal menyimpan aksi admin:', error.code);
        return fail(500, 'Aksi belum bisa dikonfirmasi. Coba ulang dengan data yang sama.');
    }
    return NextResponse.json({ orderId: data });
}

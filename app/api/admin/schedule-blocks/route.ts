import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { atWib, isRoomFilter, isScheduleDate } from '@/lib/adminSchedule';
import { addDays } from '@/lib/scheduleUtils';

const validTime = /^([01]\d|2[0-3]):[0-5]\d$/;
const uuid = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const fail = (status: number, error: string) => NextResponse.json({ error }, { status });

export async function POST(req: Request) {
    const auth = await requireAdmin();
    if (!auth.ok) return fail(auth.status, auth.error);

    if (req.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
        return fail(415, 'Permintaan harus berformat JSON.');
    }
    const body = await req.json().catch(() => null);
    if (!body || !isRoomFilter(body.room) || !isScheduleDate(body.startDate) ||
        !isScheduleDate(body.endDate) || body.endDate < body.startDate ||
        typeof body.isAllDay !== 'boolean' || typeof body.reason !== 'string' ||
        !body.reason.trim() || body.reason.trim().length > 300) {
        return fail(400, 'Periksa ruangan, tanggal, dan alasan blokir (1–300 karakter).');
    }

    if (!body.isAllDay && (typeof body.startTime !== 'string' || typeof body.endTime !== 'string' ||
        !validTime.test(body.startTime) || !validTime.test(body.endTime))) {
        return fail(400, 'Jam mulai atau selesai tidak valid.');
    }

    const start = atWib(body.startDate, body.isAllDay ? '00:00' : body.startTime);
    const end = body.isAllDay ? atWib(addDays(body.endDate, 1)) : atWib(body.endDate, body.endTime);
    if (!Number.isFinite(Date.parse(end)) || Date.parse(end) <= Date.parse(start) || Date.parse(end) <= Date.now()) {
        return fail(400, 'Akhir blokir harus setelah waktu mulai dan belum lewat.');
    }

    const { data, error } = await supabaseAdmin.rpc('create_admin_schedule_block', {
        p_room_code: body.room === 'all' ? null : body.room,
        p_starts_at: start,
        p_ends_at: end,
        p_is_all_day: body.isAllDay,
        p_reason: body.reason.trim(),
        p_created_by: auth.userId,
    });
    if (error?.code === '23P01') return fail(409, 'Rentang ini berbenturan dengan booking atau blokir aktif.');
    if (error?.code === '22023') return fail(400, 'Data blokir tidak valid.');
    if (error?.code === 'P0002') return fail(400, 'Ruangan yang dipilih tidak aktif atau tidak tersedia.');
    if (error?.code === 'PGRST202') return fail(503, 'Fitur blokir belum diaktifkan di database.');
    if (error?.code === '40P01' || error?.code === '40001') return fail(409, 'Jadwal sedang diperbarui. Silakan coba lagi.');
    if (error) {
        console.error('Gagal membuat blokir:', error.code);
        return fail(500, 'Gagal menyimpan blokir jadwal.');
    }
    return NextResponse.json({ created: data }, { status: 201 });
}

export async function DELETE(req: Request) {
    const auth = await requireAdmin();
    if (!auth.ok) return fail(auth.status, auth.error);

    const id = new URL(req.url).searchParams.get('id') ?? '';
    if (!uuid.test(id)) return fail(400, 'ID blokir tidak valid.');

    const { data, error } = await supabaseAdmin.from('schedule_blocks')
        .update({ is_active: false }).eq('id', id).eq('is_active', true).select('id').maybeSingle();
    if (error) {
        console.error('Gagal membuka blokir:', error.code);
        return fail(500, 'Gagal membuka blokir.');
    }
    if (!data) return fail(404, 'Blokir tidak ditemukan atau sudah dibuka.');
    return NextResponse.json({ ok: true });
}

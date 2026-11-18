import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { CLOCK, type HoursRange, type StudioHours } from '@/lib/studioHours';
import { isScheduleDate } from '@/lib/adminSchedule';

const fail = (status: number, error: string) => NextResponse.json({ error }, { status });

function readRanges(input: unknown): HoursRange[] {
    if (!Array.isArray(input) || input.length > 8) throw new Error('Maksimal delapan rentang per hari.');
    const ranges = input.map((item) => {
        if (!item || typeof item.start !== 'string' || typeof item.end !== 'string' ||
            !CLOCK.test(item.start) || !CLOCK.test(item.end) || item.end <= item.start) {
            throw new Error('Jam tutup harus setelah jam buka.');
        }
        return { start: item.start, end: item.end };
    }).sort((a, b) => a.start.localeCompare(b.start));
    if (ranges.some((range, i) => i > 0 && range.start < ranges[i - 1].end)) {
        throw new Error('Rentang buka tidak boleh bertumpuk.');
    }
    return ranges;
}

export async function POST(req: Request) {
    const auth = await requireAdmin();
    if (!auth.ok) return fail(auth.status, auth.error);
    if (req.headers.get('content-type')?.split(';')[0].trim() !== 'application/json') {
        return fail(415, 'Gunakan format JSON.');
    }
    const body = await req.json().catch(() => null);
    if (!body || !Number.isInteger(body.revision) || !Array.isArray(body.hours?.week) ||
        body.hours.week.length !== 7 || !body.hours.exceptions ||
        typeof body.hours.exceptions !== 'object' || Array.isArray(body.hours.exceptions)) {
        return fail(400, 'Periksa jadwal mingguan dan tanggal khusus.');
    }
    let hours: StudioHours;
    try {
        const entries = Object.entries(body.hours.exceptions);
        if (entries.length > 100 || entries.some(([date]) => !isScheduleDate(date))) {
            throw new Error('Periksa tanggal khusus (maksimal 100 tanggal).');
        }
        hours = {
            week: body.hours.week.map(readRanges),
            exceptions: Object.fromEntries(entries.map(([date, ranges]) => [date, readRanges(ranges)])),
        };
    } catch (error) {
        return fail(400, error instanceof Error ? error.message : 'Jadwal tidak valid.');
    }
    const { data, error } = await supabaseAdmin.rpc('save_studio_hours', {
        p_hours: hours, p_revision: body.revision, p_actor: auth.userId,
    });
    if (error) {
        if (error.code === '23P01' || error.code === '40001') return fail(409, error.message);
        if (error.code === '22023') return fail(400, error.message);
        return fail(500, 'Gagal menyimpan jam operasional.');
    }
    return NextResponse.json({ hours, revision: data });
}

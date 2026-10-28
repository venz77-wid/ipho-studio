// Aturan jadwal studio (satu tempat, dipakai oleh tampilan DAN server).
import type { TimeSlot } from './bookingTypes';

/** Jam mulai sesi yang tersedia setiap hari (zona waktu WIB). */
export const SLOT_START_TIMES: { id: string; startTime: string; period: TimeSlot['period'] }[] = [
    { id: '1', startTime: '10:00', period: 'Pagi' },
    { id: '2', startTime: '11:30', period: 'Pagi' },
    { id: '3', startTime: '13:30', period: 'Siang' },
    { id: '4', startTime: '15:00', period: 'Siang' },
    { id: '5', startTime: '16:30', period: 'Golden Hour' },
    { id: '6', startTime: '18:30', period: 'Malam' },
];

/** Pesanan minimal dibuat sekian menit sebelum sesi dimulai. */
export const MIN_LEAD_MINUTES = 60;

const TZ = 'Asia/Jakarta';

export interface BookedRange {
    start: string; // HH:MM
    end: string; // HH:MM
}

export const toMinutes = (t: string): number => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
};

export function calculateEndTime(start: string, durationMinutes: number): string {
    const total = toMinutes(start) + durationMinutes;
    const h = Math.floor(total / 60);
    const m = total % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Tanggal (YYYY-MM-DD) dan jam (menit sejak 00:00) saat ini di WIB. */
export function getNowWIB(): { date: string; minutes: number } {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: TZ,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
    }).formatToParts(new Date());
    const get = (type: string): string => parts.find((p) => p.type === type)?.value ?? '00';
    return {
        date: `${get('year')}-${get('month')}-${get('day')}`,
        minutes: Number(get('hour')) * 60 + Number(get('minute')),
    };
}

export function addDays(dateStr: string, n: number): string {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d + n));
    return dt.toISOString().slice(0, 10);
}

/** Tanggal awal kalender: hari ini, atau besok jika semua jam hari ini sudah lewat. */
export function getDefaultDate(): string {
    const now = getNowWIB();
    const lastStart = Math.max(...SLOT_START_TIMES.map((s) => toMinutes(s.startTime)));
    return now.minutes + MIN_LEAD_MINUTES > lastStart ? addDays(now.date, 1) : now.date;
}

/** true jika tanggal/jam tersebut sudah lewat (atau terlalu dekat dengan sekarang). */
export function isSlotInPast(date: string, startTime: string): boolean {
    const now = getNowWIB();
    if (date < now.date) return true;
    if (date > now.date) return false;
    return toMinutes(startTime) < now.minutes + MIN_LEAD_MINUTES;
}

/** true jika rentang [start, end) beririsan dengan salah satu rentang yang sudah dipesan. */
export function overlapsAny(start: string, end: string, ranges: BookedRange[]): boolean {
    const s = toMinutes(start);
    const e = toMinutes(end);
    return ranges.some((r) => s < toMinutes(r.end) && e > toMinutes(r.start));
}
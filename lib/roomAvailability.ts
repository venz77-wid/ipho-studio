import 'server-only';
import { supabaseAdmin } from './supabaseAdmin';
import { addDays } from './scheduleUtils';

type Room = { id: string; code: string };
type Interval = { start: number; end: number };

export function isBookingDate(value: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000')) return false;
    const date = new Date(value + 'T00:00:00Z');
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function wibTime(date: string, time: string): number {
    return Date.parse(date + 'T' + (time.length === 5 ? time + ':00' : time) + '+07:00');
}

export async function loadRoomAvailability(date: string, excludeBookingId?: string) {
    let activeBookings = supabaseAdmin.from('bookings').select('room_id, start_time, end_time')
        .eq('booking_date', date).in('status', ['pending', 'confirmed']);
    if (excludeBookingId) activeBookings = activeBookings.neq('id', excludeBookingId);
    const [rooms, bookings, blocks] = await Promise.all([
        supabaseAdmin.from('rooms').select('id, code').eq('is_active', true).order('code'),
        activeBookings,
        supabaseAdmin.from('schedule_blocks').select('room_id, starts_at, ends_at')
            .eq('is_active', true).lt('starts_at', addDays(date, 1) + 'T00:00:00+07:00')
            .gt('ends_at', date + 'T00:00:00+07:00'),
    ]);

    if (rooms.error || bookings.error || blocks.error) {
        throw rooms.error ?? bookings.error ?? blocks.error;
    }

    const activeRooms: Room[] = rooms.data ?? [];
    const intervals = new Map<string | null, Interval[]>();
    const add = (roomId: string | null, interval: Interval) => {
        const existing = intervals.get(roomId) ?? [];
        existing.push(interval);
        intervals.set(roomId, existing);
    };
    for (const row of bookings.data ?? []) {
        add(row.room_id, { start: wibTime(date, row.start_time), end: wibTime(date, row.end_time) });
    }
    for (const row of blocks.data ?? []) {
        add(row.room_id, { start: Date.parse(row.starts_at), end: Date.parse(row.ends_at) });
    }

    return (startTime: string, endTime: string): Room[] => {
        const start = wibTime(date, startTime);
        const end = wibTime(date, endTime);
        if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return [];

        const overlaps = (roomId: string | null) =>
            (intervals.get(roomId) ?? []).some((range) => start < range.end && end > range.start);

        // Booking lama yang masih aktif tanpa room diperlakukan sebagai jadwal studio.
        return overlaps(null) ? [] : activeRooms.filter((room) => !overlaps(room.id));
    };
}

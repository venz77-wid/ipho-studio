import { addDays, atStudioTime, STUDIO_TIME_ZONE, toMinutes } from './scheduleUtils';
import type { BookingStatus, Scheme } from './adminTypes';

export type RoomCode = 'A' | 'B' | 'C';
export type RoomFilter = RoomCode | 'all';
export type ScheduleParams = Record<string, string | string[] | undefined>;
export type StudioRoom = { id: string; code: RoomCode; name: string; is_active: boolean };

export type ScheduleBooking = {
    id: string;
    order_id: string | null;
    booking_date: string;
    start_time: string;
    end_time: string;
    room_id: string | null;
    status: BookingStatus;
    payment_scheme: Scheme;
    midtrans_status: string | null;
};

export type ScheduleBlock = {
    id: string;
    room_id: string;
    starts_at: string;
    ends_at: string;
    is_all_day: boolean;
    reason: string;
};

export type BlockInput = {
    room: RoomFilter;
    startDate: string;
    endDate: string;
    isAllDay: boolean;
    startTime: string;
    endTime: string;
    reason: string;
};

export { atStudioTime, STUDIO_TIME_ZONE } from './scheduleUtils';

export function isScheduleDate(value: unknown): value is string {
    if (typeof value !== 'string' || !/^[1-9]\d{3}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(value + 'T00:00:00Z');
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function isRoomFilter(value: unknown): value is RoomFilter {
    return value === 'all' || value === 'A' || value === 'B' || value === 'C';
}

export function roomFilter(value: unknown): RoomFilter {
    return isRoomFilter(value) ? value : 'all';
}

export function calendarHref(month: string, room: RoomFilter) {
    return '/admin/kalender?' + new URLSearchParams({ bulan: month, room });
}

export function agendaHref(date: string, room: RoomFilter) {
    return '/admin/kalender/agenda?' + new URLSearchParams({ tanggal: date, room });
}

export function monthShift(month: string, offset: number) {
    const date = new Date(month + '-01T00:00:00Z');
    date.setUTCMonth(date.getUTCMonth() + offset);
    return date.toISOString().slice(0, 7);
}

export function dateLabel(date: string) {
    return new Intl.DateTimeFormat('id-ID', { dateStyle: 'full', timeZone: STUDIO_TIME_ZONE })
        .format(new Date(atStudioTime(date)));
}

export function blockOverlapsDate(block: ScheduleBlock, date: string) {
    return Date.parse(block.starts_at) < Date.parse(atStudioTime(addDays(date, 1))) &&
        Date.parse(block.ends_at) > Date.parse(atStudioTime(date));
}

export function blockTimeLabel(block: ScheduleBlock, date: string) {
    const start = Date.parse(block.starts_at);
    const end = Date.parse(block.ends_at);
    const dayStart = Date.parse(atStudioTime(date));
    const dayEnd = Date.parse(atStudioTime(addDays(date, 1)));
    if (start <= dayStart && end >= dayEnd) return 'Seharian';
    const fmt = new Intl.DateTimeFormat('en-GB', {
        hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: STUDIO_TIME_ZONE,
    });
    return (start <= dayStart ? '00:00' : fmt.format(start)) + '–' +
        (end >= dayEnd ? '24:00' : fmt.format(end)) + ' WITA';
}

export function summarizeSchedule(bookings: ScheduleBooking[]) {
    let confirmed = 0;
    let pending = 0;
    let minutes = 0;
    for (const booking of bookings) {
        if (booking.status === 'confirmed') {
            confirmed++;
            minutes += toMinutes(booking.end_time) - toMinutes(booking.start_time);
        } else if (booking.status === 'pending' && booking.midtrans_status !== 'paid_room_conflict') {
            pending++;
        }
    }
    return { confirmed, pending, minutes };
}

export function scheduledHours(minutes: number) {
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return rest ? (hours ? hours + ' jam ' : '') + rest + ' menit' : hours + ' jam';
}

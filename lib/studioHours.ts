import { studioDayIndex } from './scheduleUtils';

export const DAY_NAMES = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
export const CLOCK = /^([01]\d|2[0-3]):[0-5]\d$/;
export type HoursRange = { start: string; end: string };
export type StudioHours = { week: HoursRange[][]; exceptions: Record<string, HoursRange[]> };

export function hoursForDate(hours: StudioHours, date: string) {
    return hours.exceptions[date] ?? hours.week[studioDayIndex(date)] ?? [];
}

export function fitsStudioHours(hours: StudioHours, date: string, start: string, end: string) {
    return CLOCK.test(start) && CLOCK.test(end) && end > start &&
        hoursForDate(hours, date).some((range) => start >= range.start && end <= range.end);
}

export function hoursLabel(ranges: HoursRange[]) {
    return ranges.map(({ start, end }) => `${start}–${end}`).join(', ') || 'Tutup';
}

import 'server-only';

import { redirect } from 'next/navigation';
import { requireAdmin } from './auth/requireAdmin';
import { supabaseAdmin } from './supabaseAdmin';
import type { BookingSource } from './adminBookingOperations';
import { atStudioTime, type ScheduleBlock, type ScheduleBooking, type StudioRoom } from './adminSchedule';

export type AgendaBooking = ScheduleBooking & {
    full_name: string;
    whatsapp: string;
    special_notes: string | null;
    total_amount: number;
    booking_source: BookingSource;
    paid_amount: number;
    completion: { completed_at: string } | { completed_at: string }[] | null;
    cashier: { amount_rupiah: number }[] | null;
    package: { title: string; image_path: string | null } | { title: string; image_path: string | null }[] | null;
};

const bookingColumns = 'id, order_id, booking_date, start_time, end_time, room_id, status, payment_scheme, midtrans_status';

export async function requireScheduleAdmin() {
    const auth = await requireAdmin();
    if (!auth.ok) redirect(auth.status === 401 ? '/login' : '/');
}

async function readPages<T>(
    fetchPage: (from: number, to: number) => PromiseLike<{ data: unknown[] | null; error: unknown }>,
): Promise<T[]> {
    const items: T[] = [];
    const limit = 500;
    for (let from = 0; ; from += limit) {
        const { data, error } = await fetchPage(from, from + limit - 1);
        if (error) throw error;
        const page = (data ?? []) as T[];
        items.push(...page);
        if (page.length < limit) return items;
    }
}

export async function loadAdminSchedule<T extends ScheduleBooking>(from: string, until: string, detail: boolean) {
    const columns = detail
        ? bookingColumns + ', full_name, whatsapp, special_notes, total_amount, paid_amount, booking_source, package:packages(title,image_path), completion:booking_session_completions(completed_at), cashier:booking_cashier_payments(amount_rupiah)'
        : bookingColumns;
    const [rooms, bookings, blocks] = await Promise.all([
        supabaseAdmin.from('rooms').select('id, code, name, is_active').order('code'),
        readPages<T>((start, end) => {
            let query = supabaseAdmin.from('bookings').select(columns)
                .gte('booking_date', from).lt('booking_date', until);
            if (!detail) query = query.in('status', ['pending', 'confirmed']);
            return query.order('booking_date').order('start_time').order('id').range(start, end);
        }),
        readPages<ScheduleBlock>((start, end) => supabaseAdmin.from('schedule_blocks')
            .select('id, room_id, starts_at, ends_at, is_all_day, reason')
            .eq('is_active', true).lt('starts_at', atStudioTime(until)).gt('ends_at', atStudioTime(from))
            .order('starts_at').order('id').range(start, end)),
    ]);
    if (rooms.error) throw rooms.error;
    return { rooms: (rooms.data ?? []) as StudioRoom[], bookings, blocks };
}

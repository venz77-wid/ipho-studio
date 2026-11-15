import 'server-only';

import { adminPaidAmount, normalizeWhatsApp, type BookingSource } from './adminBookingOperations';
import type { OrderFilters, PAYMENT_LABELS, SESSION_LABELS } from './adminOrderFilters';
import type { BookingStatus } from './adminTypes';
import { getStudioNow, toMinutes } from './scheduleUtils';
import { supabaseAdmin } from './supabaseAdmin';

type OrderRow = {
    id: string;
    order_id: string | null;
    full_name: string;
    whatsapp: string | null;
    booking_date: string;
    start_time: string;
    end_time: string;
    booking_source: BookingSource;
    status: BookingStatus;
    payment_scheme: string;
    paid_amount: number | string;
    total_amount: number | string;
    midtrans_status: string | null;
    package: Relation<{ title: string }>;
    completion: Relation<{ completed_at: string }>;
    cashier: { amount_rupiah: number | string }[] | null;
};

type Relation<T> = T | T[] | null;
const first = <T,>(value: Relation<T>) => Array.isArray(value) ? value[0] : value;
export const ORDER_PAGE_SIZE = 5;

function paymentStatus(row: OrderRow, paid: number, total: number): keyof typeof PAYMENT_LABELS {
    if (row.midtrans_status === 'paid_room_conflict') return 'review';
    if (row.status === 'cancelled' || row.status === 'expired' || row.status === 'pending') return row.status;
    if (!paid) return 'unpaid';
    if (paid >= total) return 'paid';
    return row.booking_source === 'online' && row.status === 'confirmed' &&
        row.payment_scheme === 'dp' && Number(row.paid_amount) > 0 ? 'deposit' : 'partial';
}

function sessionStatus(row: OrderRow, now: ReturnType<typeof getStudioNow>): keyof typeof SESSION_LABELS {
    if (row.midtrans_status === 'paid_room_conflict' || row.status === 'cancelled' || row.status === 'expired') {
        return 'unscheduled';
    }
    if (row.status !== 'confirmed') return 'unconfirmed';
    if (first(row.completion)?.completed_at) return 'complete';
    if (row.booking_date < now.date ||
        (row.booking_date === now.date && toMinutes(row.end_time) <= now.minutes)) return 'elapsed';
    if (row.booking_date === now.date && toMinutes(row.start_time) <= now.minutes) return 'ongoing';
    return 'upcoming';
}

function matchesSearch(row: OrderRow, needle: string) {
    if (!needle) return true;
    const normalized = needle.replace(/^#/, '').toLocaleLowerCase('id');
    if (!normalized) return false;
    if (row.order_id?.toLocaleLowerCase('id').includes(normalized) ||
        row.full_name.toLocaleLowerCase('id').includes(normalized)) return true;

    if (!/^\+?[\d ()-]+$/.test(needle) || !row.whatsapp) return false;
    const digits = needle.replace(/\D/g, '');
    if (!digits) return false;
    const phone = normalizeWhatsApp(row.whatsapp);
    return phone.includes(digits) || (digits.startsWith('0') && phone.includes(normalizeWhatsApp(digits)));
}

function toOrder(row: OrderRow, now: ReturnType<typeof getStudioNow>) {
    const totalAmount = Number(row.total_amount);
    const paidAmount = adminPaidAmount(row.booking_source, row.status, row.midtrans_status, row.paid_amount, row.cashier);

    return {
        id: row.id,
        orderId: row.order_id,
        name: row.full_name,
        whatsapp: row.whatsapp,
        packageTitle: first(row.package)?.title ?? 'Paket tidak tercatat',
        date: row.booking_date,
        start: row.start_time.slice(0, 5),
        end: row.end_time.slice(0, 5),
        source: row.booking_source,
        totalAmount,
        paidAmount,
        payment: paymentStatus(row, paidAmount, totalAmount),
        session: sessionStatus(row, now),
    };
}

export async function loadAdminOrders(filters: OrderFilters) {
    const now = getStudioNow();
    const batchSize = 250;
    const offset = (filters.page - 1) * ORDER_PAGE_SIZE;
    const items: ReturnType<typeof toOrder>[] = [];
    let total = 0;

    // Status bayar menggabungkan Midtrans dan kasir. Terapkan status sebelum pagination.
    for (let from = 0; ; from += batchSize) {
        let query = supabaseAdmin.from('bookings').select(
            'id,order_id,full_name,whatsapp,booking_date,start_time,end_time,booking_source,status,payment_scheme,paid_amount,total_amount,midtrans_status,package:packages(title),completion:booking_session_completions(completed_at),cashier:booking_cashier_payments(amount_rupiah)',
        );
        if (filters.from) query = query.gte('booking_date', filters.from);
        if (filters.to) query = query.lte('booking_date', filters.to);
        if (filters.source) query = query.eq('booking_source', filters.source);
        const { data, error } = await query.order('booking_date', { ascending: false })
            .order('start_time', { ascending: false }).order('id').range(from, from + batchSize - 1);
        if (error) throw error;
        const rows = data as unknown as OrderRow[];
        for (const row of rows) {
            if (!matchesSearch(row, filters.search)) continue;
            const order = toOrder(row, now);
            if ((filters.payment && filters.payment !== order.payment) ||
                (filters.session && filters.session !== order.session)) continue;
            if (total >= offset && items.length < ORDER_PAGE_SIZE) items.push(order);
            total += 1;
        }
        if (rows.length < batchSize) return { items, total };
    }
}

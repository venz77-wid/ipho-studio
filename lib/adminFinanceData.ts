import 'server-only';

import { supabaseAdmin } from './supabaseAdmin';
import { adminPaidAmount, CASHIER_METHODS, isCashierMethod, type BookingSource } from './adminBookingOperations';
import type { BookingStatus } from './adminTypes';
import { PAYMENT_METHOD_LABEL } from './bookingFormat';
import { addDays, atStudioTime, STUDIO_TIME_ZONE } from './scheduleUtils';
import type { DailyIncome, FinanceFilters } from './adminFinanceFilters';

type OrderIdentity = { order_id: string | null; full_name: string; booking_source: BookingSource };
type Relation<T> = T | T[] | null;
type GatewayRow = OrderIdentity & {
    id: string;
    paid_at: string;
    paid_amount: number | string;
    payment_method: string | null;
    payment_scheme: string;
    status: BookingStatus;
    midtrans_status: string | null;
};
type CashierRow = {
    request_id: string;
    recorded_at: string;
    amount_rupiah: number | string;
    method: string;
    booking: Relation<OrderIdentity>;
};
type ReceivableRow = OrderIdentity & {
    id: string;
    whatsapp: string | null;
    booking_date: string;
    start_time: string;
    end_time: string;
    total_amount: number | string;
    paid_amount: number | string;
    status: BookingStatus;
    midtrans_status: string | null;
    package: Relation<{ title: string }>;
    cashier: { amount_rupiah: number | string }[] | null;
};

export type IncomeEvent = {
    key: string;
    orderId: string | null;
    customer: string;
    source: BookingSource | null;
    timestamp: string;
    channel: 'midtrans' | 'cashier';
    method: string;
    amount: number;
};

const first = <T,>(value: Relation<T>) => Array.isArray(value) ? value[0] : value;
const studioDay = new Intl.DateTimeFormat('en-CA', { dateStyle: 'short', timeZone: STUDIO_TIME_ZONE });
// A booking holds one Midtrans receipt. Cashier receipts are stored separately.
const paidStates = ['settlement', 'capture', 'paid_room_conflict', 'refund', 'partial_refund', 'chargeback'];

async function readBatches<T>(fetchBatch: (start: number, end: number) => PromiseLike<{ data: unknown[] | null; error: unknown }>) {
    const rows: T[] = [];
    const size = 250;
    for (let start = 0; ; start += size) {
        const { data, error } = await fetchBatch(start, start + size - 1);
        if (error) throw error;
        const batch = (data ?? []) as T[];
        rows.push(...batch);
        if (batch.length < size) return rows;
    }
}

function gatewayEvent(row: GatewayRow): IncomeEvent {
    const method = row.payment_method && Object.hasOwn(PAYMENT_METHOD_LABEL, row.payment_method)
        ? PAYMENT_METHOD_LABEL[row.payment_method as keyof typeof PAYMENT_METHOD_LABEL] : '';
    return {
        key: 'midtrans-' + row.id,
        orderId: row.order_id,
        customer: row.full_name,
        source: row.booking_source,
        timestamp: row.paid_at,
        channel: 'midtrans',
        method: ['Midtrans', method, row.payment_scheme === 'dp' ? 'DP' : ''].filter(Boolean).join(' · '),
        amount: Number(row.paid_amount),
    };
}

function cashierEvent(row: CashierRow): IncomeEvent {
    const order = first(row.booking);
    return {
        key: 'cashier-' + row.request_id,
        orderId: order?.order_id ?? null,
        customer: order?.full_name ?? 'Pelanggan tidak tercatat',
        source: order?.booking_source ?? null,
        timestamp: row.recorded_at,
        channel: 'cashier',
        method: isCashierMethod(row.method) ? 'Kasir · ' + CASHIER_METHODS[row.method] : 'Kasir',
        amount: Number(row.amount_rupiah),
    };
}

export async function loadFinanceReport(filters: FinanceFilters) {
    const from = atStudioTime(filters.from);
    const until = atStudioTime(addDays(filters.to, 1));
    const [gateway, cashier, openOrders] = await Promise.all([
        readBatches<GatewayRow>((start, end) => supabaseAdmin.from('bookings')
            .select('id,order_id,full_name,booking_source,paid_at,paid_amount,payment_method,payment_scheme,status,midtrans_status')
            .eq('booking_source', 'online').gt('paid_amount', 0).gte('paid_at', from).lt('paid_at', until)
            .or('status.eq.confirmed,midtrans_status.in.(' + paidStates.join(',') + ')')
            .order('paid_at', { ascending: false }).order('id').range(start, end)),
        readBatches<CashierRow>((start, end) => supabaseAdmin.from('booking_cashier_payments')
            .select('request_id,recorded_at,amount_rupiah,method,booking:bookings(order_id,full_name,booking_source)')
            .gt('amount_rupiah', 0).gte('recorded_at', from).lt('recorded_at', until)
            .order('recorded_at', { ascending: false }).order('request_id').range(start, end)),
        readBatches<ReceivableRow>((start, end) => supabaseAdmin.from('bookings')
            .select('id,order_id,full_name,whatsapp,booking_source,booking_date,start_time,end_time,status,total_amount,paid_amount,midtrans_status,package:packages(title),cashier:booking_cashier_payments(amount_rupiah)')
            .eq('status', 'confirmed').order('booking_date').order('start_time').order('id').range(start, end)),
    ]);
    const events = [...gateway.map(gatewayEvent), ...cashier.map(cashierEvent)]
        .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp) || a.key.localeCompare(b.key));

    const days = new Map<string, DailyIncome>();
    for (let date = filters.from; date <= filters.to; date = addDays(date, 1)) {
        days.set(date, { date, midtrans: 0, cashier: 0 });
    }
    for (const event of events) {
        const day = days.get(studioDay.format(new Date(event.timestamp)));
        if (day) day[event.channel] += event.amount;
    }

    const outstanding = openOrders.flatMap((row) => {
        if (row.midtrans_status === 'paid_room_conflict') return [];
        const paid = adminPaidAmount(row.booking_source, row.status, row.midtrans_status, row.paid_amount, row.cashier);
        const total = Number(row.total_amount);
        if (paid >= total) return [];
        return [{
            id: row.id, orderId: row.order_id, customer: row.full_name, whatsapp: row.whatsapp,
            packageTitle: first(row.package)?.title ?? 'Paket tidak tercatat', date: row.booking_date,
            start: row.start_time.slice(0, 5), paid, total, remaining: total - paid
        }];
    }).sort((a, b) => {
        const aPast = a.date < filters.today;
        const bPast = b.date < filters.today;
        if (aPast !== bPast) return aPast ? 1 : -1;
        const byDate = a.date.localeCompare(b.date) || a.start.localeCompare(b.start);
        return aPast ? -byDate : byDate;
    });

    const midtrans = gateway.reduce((sum, row) => sum + Number(row.paid_amount), 0);
    const cash = cashier.reduce((sum, row) => sum + Number(row.amount_rupiah), 0);
    return {
        events, outstanding, days: [...days.values()], midtrans, cashier: cash,
        total: midtrans + cash, remaining: outstanding.reduce((sum, order) => sum + order.remaining, 0)
    };
}

import { isScheduleDate, type ScheduleParams } from './adminSchedule';

export const ORDERS_PATH = '/admin/pesanan';

export const PAYMENT_LABELS = {
    pending: 'Menunggu Pembayaran',
    deposit: 'DP Terverifikasi',
    partial: 'Dibayar Sebagian',
    paid: 'Lunas',
    unpaid: 'Belum Dibayar',
    cancelled: 'Dibatalkan',
    expired: 'Kedaluwarsa',
    review: 'Perlu Ditinjau',
} as const;

export const SESSION_LABELS = {
    upcoming: 'Mendatang',
    ongoing: 'Berlangsung',
    complete: 'Selesai',
    elapsed: 'Waktu Sesi Lewat',
    unconfirmed: 'Belum Dikonfirmasi',
    unscheduled: 'Tidak Terjadwal',
} as const;

const single = (value: string | string[] | undefined) =>
    (Array.isArray(value) ? value[0] : value) ?? '';

function option<T extends object>(options: T, value: string) {
    return Object.hasOwn(options, value) ? value as Extract<keyof T, string> : '';
}

export function readOrderFilters(params: ScheduleParams) {
    const start = single(params.mulai);
    const end = single(params.sampai);
    const source = single(params.sumber);
    const page = Number(single(params.hal));

    const from = isScheduleDate(start) ? start : '';
    const to = isScheduleDate(end) ? end : '';

    return {
        search: single(params.q).trim().slice(0, 100),
        from,
        to,
        invalidDates: (!!start && !from) || (!!end && !to) || (!!from && !!to && from > to),
        source: source === 'online' || source === 'walk_in' ? source : '',
        payment: option(PAYMENT_LABELS, single(params.bayar)),
        session: option(SESSION_LABELS, single(params.sesi)),
        page: Number.isSafeInteger(page) && page > 0 && page < 1_000_000 ? page : 1,
    } as const;
}

export type OrderFilters = ReturnType<typeof readOrderFilters>;

export function orderListQuery(filters: OrderFilters, page = filters.page) {
    const query = new URLSearchParams();
    for (const [key, value] of [
        ['q', filters.search], ['mulai', filters.from], ['sampai', filters.to],
        ['sumber', filters.source], ['bayar', filters.payment], ['sesi', filters.session],
    ]) {
        if (value) query.set(key, value);
    }
    if (page > 1) query.set('hal', String(page));
    return query.toString();
}

export function orderListHref(query = '') {
    return query ? ORDERS_PATH + '?' + query : ORDERS_PATH;
}

export function orderDetailBack(value: string) {
    const query = new URLSearchParams(value.slice(0, 1500));
    return orderListHref(orderListQuery(readOrderFilters(Object.fromEntries(query))));
}

// Menyimpan nomor pesanan di browser agar "Paket Saya" tahu pesanan milik siapa
// (sementara, sebelum ada sistem login).
import { ORDER_ID_RE } from './myBookingTypes';

const KEY = 'ipho_order_ids';

export function getSavedOrderIds(): string[] {
    if (typeof window === 'undefined') return [];
    try {
        const raw = window.localStorage.getItem(KEY);
        const arr: unknown = raw ? JSON.parse(raw) : [];
        return Array.isArray(arr)
            ? arr.filter((x): x is string => typeof x === 'string' && ORDER_ID_RE.test(x))
            : [];
    } catch {
        return [];
    }
}

export function saveOrderId(id: string): void {
    if (typeof window === 'undefined' || !ORDER_ID_RE.test(id)) return;
    const ids = getSavedOrderIds();
    if (ids.includes(id)) return;
    try {
        window.localStorage.setItem(KEY, JSON.stringify([id, ...ids].slice(0, 20)));
    } catch {
        /* penyimpanan penuh / diblokir: abaikan */
    }
}
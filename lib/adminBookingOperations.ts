import type { BookingStatus } from './adminTypes';

export const CASHIER_METHODS = { cash: 'Tunai', edc: 'EDC', qris: 'QRIS kasir' } as const;
export type CashierMethod = keyof typeof CASHIER_METHODS;
export type BookingSource = 'online' | 'walk_in';

export function isCashierMethod(value: unknown): value is CashierMethod {
    return typeof value === 'string' && Object.hasOwn(CASHIER_METHODS, value);
}

export function normalizeWhatsApp(value: string) {
    const digits = value.replace(/[^\d]/g, '');
    return digits.startsWith('0') ? '62' + digits.slice(1) : digits;
}

export function adminPaidAmount(
    source: BookingSource, status: BookingStatus, midtransStatus: string | null,
    onlineAmount: number | string, cashier: { amount_rupiah: number | string }[] | null,
) {
    const online = source === 'online' && (status === 'confirmed' || midtransStatus === 'paid_room_conflict')
        ? Number(onlineAmount) : 0;
    return online + (cashier ?? []).reduce((sum, item) => sum + Number(item.amount_rupiah), 0);
}

export function adminPaymentLabel(status: BookingStatus, paid: number, total: number, review = false) {
    if (review) return 'Pembayaran perlu ditinjau';
    if (status === 'cancelled') return 'Dibatalkan';
    if (status === 'expired') return 'Kedaluwarsa';
    if (status === 'pending') return 'Menunggu pembayaran';
    if (paid >= total) return 'Lunas';
    if (paid > 0) return 'Dibayar sebagian';
    return 'Belum dibayar';
}

export type AdminPackageOption = { id: string; title: string; price: number; duration_minutes: number };
export type AdminSlot = { start: string; end: string };

export function adminPackageImage(path: string | null | undefined): string | null {
    if (!path) return null;
    if (path.startsWith('/') && !path.startsWith('//')) return path;
    return /^https:\/\/[a-z0-9-]+\.supabase\.co\/storage\/v1\/object\/public\//i.test(path) ? path : null;
}

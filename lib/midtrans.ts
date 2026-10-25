// Pembungkus API Midtrans (Snap + Status). Hanya dipakai di server.
import crypto from 'crypto';
import { supabaseAdmin } from './supabaseAdmin';
import type { PaymentMethod } from './bookingTypes';

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'expired';

const isProd = process.env.MIDTRANS_IS_PRODUCTION === 'true';
const SNAP_URL = isProd
    ? 'https://app.midtrans.com/snap/v1/transactions'
    : 'https://app.sandbox.midtrans.com/snap/v1/transactions';
const API_URL = isProd ? 'https://api.midtrans.com/v2' : 'https://api.sandbox.midtrans.com/v2';

/** Slot terkunci 15 menit (sesuai mockup). */
export const SNAP_EXPIRY_MINUTES = 15;
export const STALE_MS = (SNAP_EXPIRY_MINUTES + 1) * 60 * 1000;

/** Pemetaan metode di website -> kode channel Snap. */
export const ENABLED_PAYMENTS: Record<PaymentMethod, string[]> = {
    qris: ['other_qris'],
    bca_va: ['bca_va'],
    mandiri_va: ['echannel'], // Mandiri Bill Payment
};

function authHeader(): string {
    const key = process.env.MIDTRANS_SERVER_KEY;
    if (!key) throw new Error('MIDTRANS_SERVER_KEY belum diisi di .env.local');
    return 'Basic ' + Buffer.from(key + ':').toString('base64');
}

export function buildOrderId(): string {
    const t = Date.now().toString(36).toUpperCase();
    const r = crypto.randomBytes(8).toString('hex').toUpperCase();
    return `IPHO-${t}-${r}`;
}

export interface SnapPayload {
    transaction_details: { order_id: string; gross_amount: number };
    item_details: { id: string; price: number; quantity: number; name: string }[];
    customer_details: { first_name: string; email: string; phone: string };
    enabled_payments: string[];
    expiry: { unit: 'minutes'; duration: number };
    callbacks: { finish: string };
}

export async function createSnapTransaction(
    payload: SnapPayload,
): Promise<{ token: string; redirect_url: string }> {
    const res = await fetch(SNAP_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: authHeader() },
        body: JSON.stringify(payload),
        cache: 'no-store',
    });
    const data = (await res.json().catch(() => ({}))) as {
        token?: string;
        redirect_url?: string;
        error_messages?: string[];
    };
    if (!res.ok || !data.token || !data.redirect_url) {
        throw new Error(data.error_messages?.join(', ') || `Midtrans menolak permintaan (${res.status})`);
    }
    return { token: data.token, redirect_url: data.redirect_url };
}

/** Status transaksi di Midtrans. null = Midtrans belum mengenal pesanan ini. */
export async function getTransactionStatus(
    orderId: string,
): Promise<{ transaction_status: string; fraud_status?: string } | null> {
    const res = await fetch(`${API_URL}/${encodeURIComponent(orderId)}/status`, {
        headers: { Accept: 'application/json', Authorization: authHeader() },
        cache: 'no-store',
    });
    const data = (await res.json().catch(() => null)) as {
        status_code?: string;
        transaction_status?: string;
        fraud_status?: string;
    } | null;
    if (data?.status_code === '401') throw new Error('Server Key Midtrans salah atau tidak aktif');
    if (!data || data.status_code === '404' || res.status === 404 || !data.transaction_status) return null;
    return { transaction_status: data.transaction_status, fraud_status: data.fraud_status };
}

export function mapTransactionStatus(ts: string, fraud?: string): BookingStatus {
    if (ts === 'settlement' || (ts === 'capture' && fraud !== 'challenge')) return 'confirmed';
    if (ts === 'expire') return 'expired';
    if (['cancel', 'deny', 'failure', 'refund', 'partial_refund', 'chargeback'].includes(ts)) return 'cancelled';
    return 'pending';
}

/** Simpan hasil dari Midtrans ke database (hanya mengubah pesanan yang masih pending). */
export async function applyTransactionResult(
    orderId: string,
    ts: string,
    fraud?: string,
): Promise<BookingStatus> {
    const status = mapTransactionStatus(ts, fraud);
    const patch: Record<string, string> = { midtrans_status: ts };
    if (status !== 'pending') patch.status = status;
    if (status === 'confirmed') patch.paid_at = new Date().toISOString();
    await supabaseAdmin.from('bookings').update(patch).eq('order_id', orderId).eq('status', 'pending');
    return status;
}

/** Cek satu pesanan pending ke Midtrans; kedaluwarsakan jika sudah lewat batas dan tak dikenal. */
export async function syncPendingBooking(orderId: string, createdAt: string): Promise<BookingStatus> {
    const tx = await getTransactionStatus(orderId);
    if (tx) return applyTransactionResult(orderId, tx.transaction_status, tx.fraud_status);
    if (Date.now() - new Date(createdAt).getTime() > STALE_MS) {
        await supabaseAdmin
            .from('bookings')
            .update({ status: 'expired' })
            .eq('order_id', orderId)
            .eq('status', 'pending');
        return 'expired';
    }
    return 'pending';
}

/** Verifikasi tanda tangan notifikasi (webhook) dari Midtrans. */
export function verifySignature(n: {
    order_id?: string;
    status_code?: string;
    gross_amount?: string;
    signature_key?: string;
}): boolean {
    const key = process.env.MIDTRANS_SERVER_KEY;
    if (!key || !n.order_id || !n.status_code || !n.gross_amount || !n.signature_key) return false;
    const expected = crypto
        .createHash('sha512')
        .update(n.order_id + n.status_code + n.gross_amount + key)
        .digest('hex');
    const a = Buffer.from(expected);
    const b = Buffer.from(n.signature_key);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
}